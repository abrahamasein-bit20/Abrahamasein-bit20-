"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
      });
      if (error) throw error;
      setMessage("If this email is eligible, a sign-in link has been sent. Check your inbox.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f6f7f5",fontFamily:"Arial,sans-serif",color:"#17231f"}}>
    <section style={{width:"100%",maxWidth:420,background:"#fff",border:"1px solid #e3e8e3",borderRadius:18,padding:30,boxShadow:"0 8px 28px rgba(25,47,37,.05)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:30}}><div style={{width:40,height:40,borderRadius:12,background:"#d6e7d9",display:"grid",placeItems:"center",fontSize:20,fontWeight:800,color:"#215b48"}}>i</div><div><div style={{fontWeight:800,fontSize:19}}>iValth</div><div style={{fontSize:10,letterSpacing:1.4,color:"#718078"}}>RESEARCH WORKSPACE</div></div></div>
      <h1 style={{fontSize:27,letterSpacing:-.8,marginBottom:8}}>Sign in to your workspace</h1>
      <p style={{fontSize:13,lineHeight:1.6,color:"#718078",marginBottom:22}}>Access is limited to authorized iValth research users.</p>
      <form onSubmit={signIn} style={{display:"grid",gap:13}}>
        <label style={{fontSize:12,fontWeight:700}}>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:6,border:"1px solid #dce3dc",borderRadius:8}} /></label>
        <label style={{fontSize:12,fontWeight:700}}>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:6,border:"1px solid #dce3dc",borderRadius:8}} /></label>
        <button disabled={busy} type="submit" style={{padding:12,border:0,borderRadius:8,background:"#215b48",color:"#fff",fontWeight:700,marginTop:3}}>{busy?"Working…":"Sign in"}</button>
      </form>
      <button disabled={busy||!email} onClick={requestAccess} style={{width:"100%",padding:12,border:"1px solid #dce3dc",borderRadius:8,background:"#fff",color:"#215b48",fontWeight:700,marginTop:10}}>Email me a sign-in link</button>
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#8a5b20",background:"#fbf2e5",padding:10,borderRadius:8,marginTop:14}}>{message}</p>}
      <p style={{fontSize:10,lineHeight:1.6,color:"#718078",marginTop:24}}>No public registration is offered from this screen. User provisioning and access policy remain administrator-controlled.</p>
    </section>
  </main>;
}
