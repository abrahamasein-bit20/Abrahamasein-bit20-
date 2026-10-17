export default function SetupPage() {
  return (
    <main style={{maxWidth:720,margin:"10vh auto",padding:24,fontFamily:"Arial,sans-serif",color:"#17231f"}}>
      <p style={{letterSpacing:2,fontSize:11,fontWeight:700,color:"#60766a"}}>iVALTH · CONFIGURATION</p>
      <h1 style={{fontSize:32,letterSpacing:-1}}>Connect the research workspace</h1>
      <p style={{lineHeight:1.7,color:"#52645a"}}>The workspace is open and does not require an account. The research engine needs the public Supabase project URL and publishable key to reach its server-side research service.</p>
      <ol style={{lineHeight:2}}>
        <li>Open the Netlify project settings.</li>
        <li>Under environment variables, add <code>NEXT_PUBLIC_SUPABASE_URL</code> using the Supabase project API URL.</li>
        <li>Add <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> using the project's publishable key.</li>
        <li>Trigger a fresh deploy so the browser app receives the updated configuration.</li>
      </ol>
      <section style={{marginTop:24,background:"#f4f6f3",border:"1px solid #e0e6df",borderRadius:12,padding:16,lineHeight:1.7}}>
        <b>Research provider</b>
        <p style={{marginBottom:0}}>The AI research service also needs <code>OPENAI_API_KEY</code> configured as a server-side secret in Supabase Edge Function secrets. Do not put the OpenAI key in Netlify public variables, browser code, or source control.</p>
      </section>
      <p style={{fontSize:13,color:"#60766a",lineHeight:1.7}}>Research runs are saved under a browser-specific workspace ID. Clearing this browser's local storage will create a new workspace ID; prior runs remain associated with the previous one.</p>
      <p><a href="/" style={{color:"#215b48",fontWeight:700}}>Return to workspace</a></p>
    </main>
  );
}
