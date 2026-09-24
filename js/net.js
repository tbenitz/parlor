const Net=(()=>{
  const ICE={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},{urls:"stun:stun2.l.google.com:19302"}]};
  let peer=null,mediaConn=null,dataConn=null,localStream=null,remoteId=null,handlers={},role=null,roomId=null;
  function on(e,fn){handlers[e]=fn} function emit(e,p){if(handlers[e])handlers[e](p)}
  function code(){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";const arr=new Uint8Array(6);crypto.getRandomValues(arr);arr.forEach(n=>s+=a[n%a.length]);return s}
  async function media(){
    if(localStream&&localStream.active){emit("local-stream",localStream);return localStream}
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){emit("media-skip","no-api");return null}
    try{
      localStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"},audio:{echoCancellation:true,noiseSuppression:true}});
      emit("local-stream",localStream);maybeCall();return localStream;
    }catch(err){localStream=null;emit("media-skip",err);return null}
  }
  function wireData(conn){dataConn=conn;remoteId=conn.peer||remoteId;conn.on("open",()=>{remoteId=conn.peer||remoteId;emit("data-open");maybeCall()});conn.on("data",m=>emit("data",m));conn.on("close",()=>emit("data-close"));conn.on("error",e=>emit("error",e))}
  function wireCall(call){mediaConn=call;try{call.answer(localStream||undefined)}catch(_){}call.on("stream",r=>emit("remote-stream",r));call.on("close",()=>emit("media-close"));call.on("error",e=>emit("error",e))}
  function maybeCall(){if(!peer||!localStream||!remoteId)return;if(mediaConn&&(mediaConn.open||mediaConn.peerConnection))return;try{const call=peer.call(remoteId,localStream);if(call)wireCall(call)}catch(_){}}
  function attachPeer(instance){peer=instance;peer.on("error",e=>{if(e&&e.type==="unavailable-id"&&role==="host"){try{peer.destroy()}catch(_){}roomId=code();attachPeer(new Peer(roomId,{debug:1,config:ICE}));return}emit("error",e)});peer.on("disconnected",()=>emit("status","Reconnecting…"));peer.on("connection",conn=>{if(dataConn&&dataConn.open){conn.close();return}wireData(conn)});peer.on("call",wireCall)}
  async function hostTable(){role="host";roomId=code();const instance=new Peer(roomId,{debug:1,config:ICE});attachPeer(instance);await new Promise((resolve,reject)=>{instance.on("open",id=>{roomId=id;emit("ready",{id,role});resolve(id)});setTimeout(()=>reject(new Error("Handshake timed out.")),15000)});return roomId}
  async function joinTable(id){role="guest";roomId=String(id).trim().toUpperCase();remoteId=roomId;const instance=new Peer(undefined,{debug:1,config:ICE});attachPeer(instance);await new Promise((resolve,reject)=>{instance.on("open",()=>{emit("ready",{id:instance.id,role});const conn=instance.connect(roomId,{reliable:true});wireData(conn);resolve(roomId)});setTimeout(()=>reject(new Error("Handshake timed out.")),15000)});return roomId}
  function send(obj){if(dataConn&&dataConn.open)dataConn.send(obj)}
  function setTrack(kind,enabled){if(!localStream){if(enabled)media();return}localStream.getTracks().filter(t=>t.kind===kind).forEach(t=>{t.enabled=enabled})}
  function hangup(){try{if(mediaConn)mediaConn.close()}catch(_){}try{if(dataConn)dataConn.close()}catch(_){}try{if(peer)peer.destroy()}catch(_){}if(localStream)localStream.getTracks().forEach(t=>t.stop());peer=mediaConn=dataConn=localStream=remoteId=null;role=roomId=null}
  return{on,hostTable,joinTable,send,setTrack,hangup,media,get role(){return role},get roomId(){return roomId},get hasMedia(){return !!(localStream&&localStream.active)}}
})();
