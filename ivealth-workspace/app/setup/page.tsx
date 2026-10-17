export default function SetupPage() {
  return (
    <main style={{maxWidth:720,margin:"10vh auto",padding:"24px",fontFamily:"Arial,sans-serif",color:"#17231f"}}>
      <p style={{letterSpacing:2,fontSize:11,fontWeight:700,color:"#60766a"}}>iVALTH · INITIAL CONFIGURATION</p>
      <h1 style={{fontSize:32,letterSpacing:-1}}>Connect the workspace to Supabase</h1>
      <p style={{lineHeight:1.7,color:"#52645a"}}>The workspace cannot currently read its Supabase configuration. If you have already added both environment variables in Vercel, this screen may be from a deployment created before those values were saved. Trigger a fresh production deployment; if this screen remains afterward, check the variable names and deployment logs.</p>
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
      <section style={{marginTop:28,borderTop:"1px solid #e0e6df",paddingTop:22}}>
        <h2 style={{fontSize:23,letterSpacing:-0.5}}>Enable the OpenAI research agent</h2>
        <p style={{lineHeight:1.7,color:"#52645a"}}>The research agent calls the OpenAI Responses API from a Supabase Edge Function. The API key belongs in Supabase's server-side secrets, not in Vercel's public environment variables or browser code.</p>
        <ol style={{lineHeight:2}}>
          <li>Complete the OpenAI Platform key setup flow and securely copy or download the new key. Do not paste it into this page, ChatGPT, GitHub, or source code.</li>
          <li>Open <a href="https://supabase.com/dashboard/project/xketsvvssnlhzyenmnsw/functions/secrets" style={{color:"#215b48"}}>Supabase Edge Function Secrets</a> for the iValth project.</li>
          <li>Add <code>OPENAI_API_KEY</code> and paste the key into its Value field.</li>
          <li>Optionally add <code>OPENAI_RESEARCH_MODEL</code> with value <code>gpt-6.1-sol</code>, and <code>OPENAI_REASONING_EFFORT</code> with value <code>medium</code>. These settings can be changed later.</li>
          <li>Save the secrets. Supabase makes saved function secrets available to deployed Edge Functions; the function does not need to be redeployed just to read a newly saved secret.</li>
        </ol>
        <div style={{background:"#f4f6f3",border:"1px solid #e0e6df",borderRadius:12,padding:16,lineHeight:1.7}}>
          <b>Keep key handling separate</b><br/>OpenAI API usage is billed separately from a ChatGPT subscription. Never expose the API key to the browser or use a <code>NEXT_PUBLIC_</code> variable for it. A created key is not automatically saved in Supabase; you must add it there yourself.
        </div>
        <p style={{fontSize:13,color:"#60766a",lineHeight:1.7}}>The research agent requires a signed-in user and a working OpenAI API key. Its outputs are provisional: search trace shows which URLs the API surfaced, but does not independently validate that each source supports each claim. Human review remains required.</p>
      </section>
      <p style={{fontSize:13,color:"#60766a",lineHeight:1.7}}>After a fresh deployment picks up the configuration, the login screen should be available. If it is not, inspect the latest deployment's build and runtime logs. The evidence API and approval flow still require authenticated end-to-end testing.</p>
    </main>
  );
}
