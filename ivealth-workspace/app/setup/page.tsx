export default function SetupPage() {
  return (
    <main style={{maxWidth:720,margin:"10vh auto",padding:"24px",fontFamily:"Arial,sans-serif",color:"#17231f"}}>
      <p style={{letterSpacing:2,fontSize:11,fontWeight:700,color:"#60766a"}}>iVALTH · INITIAL CONFIGURATION</p>
      <h1 style={{fontSize:32,letterSpacing:-1}}>Connect the workspace to Supabase</h1>
      <p style={{lineHeight:1.7,color:"#52645a"}}>The web application is deployed, but authentication is not configured yet. Add the two public Supabase values to the Vercel project before using the workspace.</p>
      <ol style={{lineHeight:2}}>
        <li>Open the <a href="https://vercel.com/dashboard" style={{color:"#215b48"}}>Vercel dashboard</a> and select <b>ivealth-research-workspace</b>.</li>
        <li>Open <b>Settings → Environment Variables</b>.</li>
        <li>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> with the project API URL.</li>
        <li>Add <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> with the project's publishable/anon key.</li>
        <li>Apply both to Preview and Production, then redeploy.</li>
      </ol>
      <div style={{background:"#f4f6f3",border:"1px solid #e0e6df",borderRadius:12,padding:16,lineHeight:1.7}}>
        <b>Security note</b><br/>Only the public anon/publishable key belongs here. Never add <code>SUPABASE_SERVICE_ROLE_KEY</code> to a <code>NEXT_PUBLIC_</code> variable or browser code.
      </div>
      <p style={{fontSize:13,color:"#60766a",lineHeight:1.7}}>After configuration, the login screen will be available. The evidence API and approval flow still require authenticated end-to-end testing.</p>
    </main>
  );
}
