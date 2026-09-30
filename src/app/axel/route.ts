import { head, htmlResponse, LINE_TALK_URL } from "@/lib/axel-launcher"

export const dynamic = "force-static"

// ホーム画面に AXEL アイコンを追加する方法の案内（案A）
export function GET() {
  return htmlResponse(`${head("AXEL をホーム画面に追加")}<body><div class="wrap">
<img class="icon" src="/axel-app/icon-180.png" alt="AXEL">
<h1>AXEL をホーム画面に追加</h1>
<p class="lead">ホーム画面の AXEL アイコンをタップするだけで、<br>LINE の AXEL トーク画面が直接開きます。</p>

<section id="in-line" class="card" hidden>
  <h2>まずはブラウザで開いてください</h2>
  <p class="note" style="color:rgba(255,255,255,.8);font-size:13.5px;margin:0 0 12px">LINE 内の画面からはホーム画面に追加できません。下のボタンで Safari／Chrome を開き、表示される手順に進んでください。</p>
  <a class="btn" href="/axel?openExternalBrowser=1">ブラウザで開く</a>
</section>

<section id="ios" class="card" hidden>
  <h2>iPhone（Safari）の場合</h2>
  <ol>
    <li>画面下の <b>共有ボタン</b>（□に↑のマーク）をタップ</li>
    <li>メニューを下にスクロールし <b>「ホーム画面に追加」</b> をタップ</li>
    <li>名前が「AXEL」になっていることを確認し、右上の <b>「追加」</b> をタップ</li>
  </ol>
</section>

<section id="android" class="card" hidden>
  <h2>Android（Chrome）の場合</h2>
  <ol>
    <li>画面右上の <b>︙（メニュー）</b> をタップ</li>
    <li><b>「ホーム画面に追加」</b> をタップ（「ショートカットを作成」と表示される場合はそちらを選択）</li>
    <li>名前が「AXEL」になっていることを確認し、<b>「追加」</b> をタップ</li>
  </ol>
</section>

<section id="other" class="card" hidden>
  <h2>スマートフォンでご利用ください</h2>
  <p class="note" style="color:rgba(255,255,255,.8);font-size:13.5px;margin:0 0 12px">このページをスマートフォンの Safari（iPhone）または Chrome（Android）で開くと、追加手順が表示されます。</p>
</section>

<a class="btn ghost" href="${LINE_TALK_URL}">今すぐ AXEL を開く</a>
<p class="note">※ 追加したアイコンから開くと、LINE の AXEL トーク画面に移動します。LINE アプリがインストールされ、AXEL を友だち追加している必要があります。<br>※ iPhone では、初回などに「"LINE"で開きますか？」と表示される場合があります。「開く」を選んでください。</p>
</div>
<script>
(function(){
  var ua = navigator.userAgent;
  var inLine = / Line\\//i.test(ua);
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var show = function(id){ document.getElementById(id).hidden = false; };
  if (inLine) { show('in-line'); return; }
  if (ios) show('ios'); else if (android) show('android'); else show('other');
  // The icon saves the CURRENT URL: point it at the launcher so tapping the
  // icon opens the talk directly (the manifest start_url does the same where
  // the browser honours it).
  if (ios || android) { try { history.replaceState(null, '', '/axel/go?src=home'); } catch (e) {} }
})();
</script></body></html>`)
}
