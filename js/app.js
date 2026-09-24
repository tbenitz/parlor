const Parlor=(()=>{
  const $=id=>document.getElementById(id);
  const landing=$("landing"), lobby=$("lobby"), table=$("table");
  let seat=null, gameId=null, state=null, micOn=false, camOn=false;
  function show(screen){landing.classList.toggle("hidden",screen!=="landing");lobby.classList.toggle("hidden",screen!=="lobby");table.classList.toggle("hidden",screen!=="table")}
  function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add("hidden"),2400)}
  window.Parlor={toast};
  function lobbyState(title,copy,status,showCode){$("lobby-title").textContent=title;$("lobby-copy").textContent=copy;$("lobby-status").textContent=status;$("host-code-wrap").classList.toggle("hidden",!showCode)}
  async function startHost(){seat="host";show("lobby");lobbyState("Open the table","Share the code when it appears. Camera is optional.","Opening a handshake…",false);try{const id=await Net.hostTable();$("host-code").textContent=id;lobbyState("Your table is set","Send the code to the other person. Keep this tab open.","Waiting for someone to sit down…",true)}catch(err){lobbyState("Couldn\u2019t open the table","The handshake server may be busy. Try again in a moment.",String(err.message||err),false)}}
  async function startJoin(code){seat="guest";show("lobby");lobbyState("Walking over","Finding the table. Camera is optional.","Connecting…",false);try{await Net.joinTable(code);lobbyState("Knocking","Opening a direct line for moves and chat.","Connecting…",false)}catch(err){lobbyState("Couldn\u2019t sit down","Check the code and that the host\u2019s tab is still open.",String(err.message||err),false)}}
  function sitDown(){show("table");$("table-id").textContent=Net.roomId||"";$("local-role").textContent=seat==="host"?"Host":"Guest";$("remote-role").textContent=seat==="host"?"Guest":"Host";$("net-dot").classList.add("live");$("net-label").textContent="Direct line";$("picker-hint").textContent=seat==="host"?"You play White / Black / X. Either of you can pick a game.":"You play Black / Red / O. Either of you can pick a game.";showPicker();addChat("table","You are seated. Camera is optional — use the icons if you want video.")}
  function showPicker(){gameId=null;state=null;$("game-picker").classList.remove("hidden");$("game-root").classList.add("hidden")}
  function startGame(id,incoming){const game=Games[id];if(!game)return;gameId=id;state=incoming||game.newState();$("game-picker").classList.add("hidden");$("game-root").classList.remove("hidden");$("game-title").textContent=game.title;renderGame()}
  function renderGame(){const game=Games[gameId];if(!game)return;const ctx={seat,tryMove(payload){const packed={...payload,seat};const next=game.apply(state,packed);if(next===state)return;state=next;Net.send({type:"move",game:gameId,payload:packed});renderGame()},setLocal(local){state=local;renderGame()}};game.render($("board-host"),state,ctx);$("turn-line").textContent=game.status(state,seat);$("game-msg").textContent=""}
  function addChat(who,text){const line=document.createElement("div");line.className="chat-line";line.innerHTML="<span class='who'></span><span class='txt'></span>";line.querySelector(".who").textContent=who;line.querySelector(".txt").textContent=text;$("chat-log").appendChild(line);$("chat-log").scrollTop=$("chat-log").scrollHeight}
  Net.on("local-stream",stream=>{$("local-video").srcObject=stream;const fb=$("local-fallback");if(fb)fb.classList.add("hidden");camOn=micOn=true;$("btn-cam").classList.remove("off");$("btn-mic").classList.remove("off")});
  Net.on("remote-stream",stream=>{$("remote-video").srcObject=stream;$("remote-fallback").classList.add("hidden")});
  Net.on("ready",info=>{if(seat==="host"){if(info&&info.id)$("host-code").textContent=info.id;$("lobby-status").textContent="Handshake live. Waiting for a guest…"}else $("lobby-status").textContent="Handshake live. Opening the table…"});
  Net.on("data-open",()=>sitDown());
  Net.on("data",msg=>{if(!msg||typeof msg!=="object")return;if(msg.type==="chat")addChat("Them",msg.text);if(msg.type==="select")startGame(msg.game);if(msg.type==="move"&&msg.game===gameId){const placing=state&&state.placing,selected=state&&state.selected,promo=state&&state.promo;state=Games[gameId].apply(state,msg.payload);if(gameId==="battleship"&&placing)state.placing=placing;if((gameId==="chess"||gameId==="checkers")&&selected&&state.selected==null&&msg.payload.seat!==seat)state={...state,selected};if(gameId==="chess"&&promo)state={...state,promo};renderGame()}if(msg.type==="reset")showPicker()});
  Net.on("error",e=>{const text=(e&&e.type==="peer-unavailable")?"No table with that code.":(e&&e.message)||String(e);toast(text);$("lobby-status").textContent=text;$("lobby-dot").classList.add("bad");$("net-dot").classList.remove("live");$("net-dot").classList.add("bad");$("net-label").textContent="Link problem"});
  Net.on("data-close",()=>{$("net-dot").classList.remove("live");$("net-dot").classList.add("bad");$("net-label").textContent="They left";toast("The other seat is empty.")});
  $("btn-preview").addEventListener("click",()=>{seat="host";$("table-id").textContent="PREVIEW";$("local-role").textContent="Preview";$("remote-role").textContent="Empty seat";$("net-label").textContent="Preview only";$("picker-hint").textContent="Look around, then Host / Join to play someone.";show("table");showPicker();addChat("table","Preview mode — host a table to play another person.")});
  $("btn-host").addEventListener("click",startHost);
  $("btn-show-join").addEventListener("click",()=>{$("join-form").classList.toggle("hidden");$("join-code").focus()});
  $("join-form").addEventListener("submit",e=>{e.preventDefault();const code=$("join-code").value.trim();if(code.length<4){toast("Enter the table code.");return}startJoin(code)});
  $("btn-copy-code").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("host-code").textContent);toast("Code copied.")}catch(_){toast($("host-code").textContent)}});
  $("btn-leave-lobby").addEventListener("click",leave);$("btn-leave").addEventListener("click",leave);
  $("btn-mic").addEventListener("click",()=>{micOn=!micOn;Net.setTrack("audio",micOn);$("btn-mic").classList.toggle("off",!micOn)});
  $("btn-cam").addEventListener("click",()=>{camOn=!camOn;Net.setTrack("video",camOn);$("btn-cam").classList.toggle("off",!camOn)});
  document.querySelectorAll(".game-card").forEach(btn=>btn.addEventListener("click",()=>{const id=btn.dataset.game;startGame(id);Net.send({type:"select",game:id})}));
  $("btn-change-game").addEventListener("click",()=>{showPicker();Net.send({type:"reset"})});
  $("btn-reset-game").addEventListener("click",()=>{if(!gameId)return;startGame(gameId);Net.send({type:"select",game:gameId})});
  $("chat-form").addEventListener("submit",e=>{e.preventDefault();const text=$("chat-input").value.trim();if(!text)return;$("chat-input").value="";addChat("You",text);Net.send({type:"chat",text})});
  function leave(){Net.hangup();$("local-video").srcObject=null;$("remote-video").srcObject=null;$("chat-log").innerHTML="";$("remote-fallback").classList.remove("hidden");$("net-dot").classList.remove("live","bad");show("landing")}
  return{toast}
})();
