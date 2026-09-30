import { head, htmlResponse, LINE_TALK_INTENT, LINE_TALK_SCHEME, LINE_TALK_URL } from "@/lib/axel-launcher"

export const dynamic = "force-static"

// ホーム画面の AXEL アイコンが開くページ：LINE の AXEL トークへ直接移動（案A）
export function GET() {
  return htmlResponse(`${head("AXEL")}<body><div class="wrap" style="padding-top:18vh;text-align:center">
<img class="icon" src="/axel-app/icon-180.png" alt="AXEL">
<h1>AXEL を開いています…</h1>
<p class="lead">自動で開かない場合は、下のボタンをタップしてください。</p>
<a class="btn" id="open" href="${LINE_TALK_URL}">LINE で AXEL を開く</a>
<a class="btn ghost" href="/axel" style="font-size:12.5px">ホーム画面への追加方法</a>
</div>
<script>
(function(){
  var ua = navigator.userAgent;
  if (/ Line\\//i.test(ua)) { location.replace(${JSON.stringify(LINE_TALK_URL)}); return; }
  var target = /Android/.test(ua) ? ${JSON.stringify(LINE_TALK_INTENT)}
    : /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? ${JSON.stringify(LINE_TALK_SCHEME)}
    : null;
  if (target) setTimeout(function(){ location.href = target; }, 60);
})();
</script></body></html>`)
}
