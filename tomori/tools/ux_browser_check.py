"""Mobile controls, menus, pause flow, failed assets and cold-start checks.

Uses isolated browser storage; never touches the user's saved game.
Run with the same local static server as browser_check.py.
"""
import argparse
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--url', default='http://127.0.0.1:8006/tomori/')
ap.add_argument('--out', default='/tmp/tomori-ux-check')
args = ap.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
KEY = 'sword-sale-v1'


def snapshot(page):
    return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)


def prepare(page, kind):
    # A new title page has no active in-memory game to overwrite the fixture on pagehide.
    page.goto(args.url)
    page.evaluate("""kind=>{
      const s=TomoriCore.fresh();s.story=null;s.view='camp';
      if(kind==='battle'){s.next=4;s.route='help';s.cleared=[1,3];TomoriCore.rest(s);TomoriCore.startBattle(s,4)}
      if(kind==='story'){s.story={id:'intro',index:0};s.view='story'}
      localStorage.setItem('sword-sale-v1',JSON.stringify(s));
      localStorage.setItem('tomori-preferences-v1',JSON.stringify({speed:'instant',guideSeen:true,reduced:true}));
    }""", kind)
    page.reload()
    page.locator('#continue').click()
    page.wait_for_function("document.getElementById('loading').hidden")


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    errors = []
    bad = []
    results = {'viewports': []}
    for w, h in [(320, 568), (390, 660), (390, 844), (430, 932), (844, 390)]:
        context = browser.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True)
        context.on('page', lambda p: p.on('pageerror', lambda e: errors.append(str(e))))
        context.on('response', lambda r: bad.append([r.status, r.url]) if r.status >= 400 else None)
        page = context.new_page()
        prepare(page, 'battle')
        page.locator('[data-hero=rine]').tap()
        assert page.locator('#active-hero').inner_text() == 'リネの行動'
        assert page.locator('[data-select=rine]').get_attribute('class').find('selected') >= 0
        assert page.locator('[data-action=heal]').is_disabled()
        assert '満タン' in page.locator('[data-action=heal]').inner_text()
        assert page.locator('#battle-potion').is_disabled()
        page.locator('[data-hero=ash]').tap()
        assert 'かばう' in page.locator('[data-action=guard]').inner_text()
        for enemy in ['e0', 'e1', 'e2']:
            page.locator('[data-target=' + enemy + ']').tap()
            assert 'selected' in page.locator('[data-target=' + enemy + ']').get_attribute('class')
        before = snapshot(page)
        page.locator('#battle-menu').tap()
        page.locator('#battle-settings').tap()
        page.locator('#sound-bgm').uncheck()
        assert not page.evaluate("JSON.parse(localStorage.getItem('sword-sale-audio')).bgm")
        page.locator('#settings-dialog [data-close]').tap()
        assert page.locator('#battle-dialog').is_visible()
        assert snapshot(page) == before
        page.locator('#battle-dialog [data-close]').first.tap()
        page.locator('[data-target=e1]').tap()
        page.locator('[data-action=attack]').tap()
        page.wait_for_function("document.querySelector('[data-hero=ash]').disabled")
        assert snapshot(page)['battle']['heroes'][0]['acted']
        assert snapshot(page)['battle']['enemies'][1]['hp'] < before['battle']['enemies'][1]['hp']
        page.screenshot(path=str(out / f'battle-{w}-{h}.png'))
        page.close()

        page = context.new_page()
        prepare(page, 'camp')
        assert page.locator('.front-badge').inner_text() == '先頭'
        assert 'Ⅰ' not in page.locator('#hub-party').inner_text()
        for button, dialog in [('party-open', 'party-dialog'), ('gear-open', 'gear-dialog'), ('bag-open', 'bag-dialog'), ('route', 'route-dialog'), ('journal-open', 'journal-dialog'), ('hub-settings', 'settings-dialog')]:
            page.locator('#' + button).tap()
            box = page.locator('#' + dialog).bounding_box()
            assert box['x'] >= -1 and box['x'] + box['width'] <= w + 1, (w, dialog, box)
            assert box['y'] >= -1 and box['y'] + box['height'] <= h + 1, (h, dialog, box)
            if dialog == 'party-dialog':
                for el in page.locator('[data-pick],[data-front]').all():
                    assert el.evaluate("e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length}") == 1
                page.locator('[data-pick=noa]').tap()
                assert '先に外して' in page.locator('#party-status').inner_text()
                assert len(snapshot(page)['party']) == 3
                page.locator('[data-pick=finn]').tap()
                page.locator('[data-pick=noa]').tap()
                page.locator('#party-confirm').tap()
                assert snapshot(page)['party'] == ['ash', 'rine', 'noa']
                page.locator('#party-open').tap()
            page.locator('#' + dialog).evaluate('(d)=>d.scrollTop=d.scrollHeight')
            page.keyboard.press('Escape')
            page.locator('#' + button).tap()
            assert page.locator('#' + dialog).evaluate('(d)=>d.scrollTop') == 0
            page.screenshot(path=str(out / f'{dialog}-{w}-{h}.png'))
            page.locator('#' + dialog + ' [data-close]').first.tap()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(out / f'hub-{w}-{h}.png'))
        page.close()

        page = context.new_page()
        prepare(page, 'story')
        before = snapshot(page)
        page.locator('#story-settings').tap()
        page.locator('#sound-se').uncheck()
        page.locator('#settings-dialog [data-close]').tap()
        assert snapshot(page) == before
        assert page.locator('#app').get_attribute('data-screen') == 'story'
        page.locator('#story-next').tap()
        assert snapshot(page)['story']['index'] == 1
        page.screenshot(path=str(out / f'story-{w}-{h}.png'))
        context.close()
        results['viewports'].append([w, h])
        print('UX controls and menus passed', w, h, flush=True)

    # A menu opened during the final action must hold the pending enemy turn.
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    page = context.new_page()
    prepare(page, 'battle')
    for hero in ['ash', 'rine', 'finn']:
        page.locator('[data-select=' + hero + ']').click()
        page.locator('[data-action=guard]').click()
    page.locator('#battle-menu').click()
    page.wait_for_timeout(500)
    held = snapshot(page)['battle']
    assert held['phase'] == 'enemy' and held['round'] == 1
    page.locator('#battle-settings').click()
    page.locator('#settings-dialog [data-close]').click()
    page.wait_for_timeout(250)
    assert snapshot(page)['battle'] == held
    page.locator('#battle-dialog [data-close]').first.click()
    page.wait_for_function("JSON.parse(localStorage.getItem('sword-sale-v1')).battle.round===2")
    page.wait_for_function("!document.querySelector('[data-select=ash]').disabled")
    page.locator('[data-select=ash]').click()
    page.locator('[data-action=attack]').click()
    page.wait_for_function("document.querySelector('#battle-field .float-number')!==null")
    page.locator('#battle-menu').click()
    page.locator('#retreat').click()
    assert page.locator('#app').get_attribute('data-screen') == 'result'
    assert page.locator('#battle-field .float-number').count() == 0
    assert 'show' not in (page.locator('#toast').get_attribute('class') or '')
    context.close()
    results['nested_menu_pause_resume'] = True
    results['scene_effect_cleanup'] = True

    # A missing expression may fall back to a full neutral image without blocking play.
    context = browser.new_context(viewport={'width': 390, 'height': 660})
    context.route('**/assets/portraits/rine-smile-portrait.webp*', lambda route: route.abort())
    page = context.new_page()
    page.goto(args.url)
    page.locator('#new-game').click()
    page.wait_for_function("document.querySelector('#story-character').dataset.expression==='neutral'")
    assert page.locator('#story > img:visible').count() == 1
    page.locator('#story-next').click()
    page.locator('#story-next').click()
    assert snapshot(page)['story']['index'] >= 1
    context.close()
    results['missing_portrait_fallback'] = True

    # Match the before-change measurement: 3.2 Mbps and 100 ms latency, cache disabled.
    context = browser.new_context(viewport={'width': 390, 'height': 660}, has_touch=True, is_mobile=True)
    page = context.new_page()
    cdp = context.new_cdp_session(page)
    cdp.send('Network.enable')
    cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 100, 'downloadThroughput': 400000, 'uploadThroughput': 100000, 'connectionType': 'cellular4g'})
    page.goto(args.url)
    page.wait_for_function("document.querySelector('.title-character').complete")
    start = time.monotonic()
    page.locator('#new-game').click()
    page.wait_for_function("document.getElementById('app').dataset.screen==='story'")
    page.wait_for_function("document.getElementById('story-character').complete&&document.getElementById('story-character').naturalWidth>0")
    results['cold_start_seconds'] = round(time.monotonic() - start, 2)
    results['image_transfer_bytes'] = page.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')).reduce((s,e)=>s+e.transferSize,0)")
    results['startup_image_requests'] = page.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')).length")
    context.close()
    assert not errors, errors
    assert not bad, bad
    results['page_errors'] = errors
    results['failed_requests'] = bad
    (out / 'results.json').write_text(json.dumps(results, indent=2))
    print(json.dumps(results), flush=True)
    browser.close()
