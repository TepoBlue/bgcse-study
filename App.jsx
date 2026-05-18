import { useState, useEffect, useRef } from "react";

// ── Access Codes (teacher controls these) ─────────────────────────────────────
const VALID_CODES = ["BGCSE2024", "STUDY001", "STUDY002", "STUDY003", "STUDY004", "STUDY005"];
const TEACHER_CODE = "TEACHER123";

// ── BGCSE Syllabus ────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id: "maths", label: "Mathematics", icon: "∑", color: "#3b82f6",
    topics: ["Number & Computation","Fractions & Percentages","Algebra & Expressions","Linear Equations","Simultaneous Equations","Quadratic Equations","Sequences & Series","Functions & Graphs","Geometry & Angles","Pythagoras Theorem","Circle Theorems","Trigonometry","Mensuration","Vectors","Matrices","Statistics & Probability","Transformation Geometry","Sets"] },
  { id: "physics", label: "Physics", icon: "⚡", color: "#f59e0b",
    topics: ["Measurements & Units","Motion & Speed","Forces & Newton's Laws","Momentum","Work, Energy & Power","Pressure & Density","Thermal Physics","Waves","Light & Optics","Sound","Electricity & Circuits","Magnetism","Electromagnetic Induction","Atomic Physics","Radioactivity"] },
  { id: "chemistry", label: "Chemistry", icon: "⚗", color: "#10b981",
    topics: ["Particle Theory","Separation Techniques","Atomic Structure","Periodic Table","Chemical Bonding","Chemical Equations","Moles & Stoichiometry","Acids, Bases & Salts","Redox Reactions","Electrolysis","Rates of Reaction","Energy Changes","Metals & Reactivity","Non-metals","Organic Chemistry","Industrial Chemistry"] },
  { id: "biology", label: "Biology", icon: "🧬", color: "#ec4899",
    topics: ["Cell Structure","Diffusion & Osmosis","Biological Molecules","Enzymes","Photosynthesis","Digestion & Nutrition","Respiration","Gas Exchange","Transport in Plants","Circulatory System","Excretion & Homeostasis","Nervous System","Reproduction","Genetics & Inheritance","Evolution","Ecology"] },
];

// ── Storage helpers ───────────────────────────────────────────────────────────
const storage = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

async function generateNotes(subject, topic) {
  const prompt = `Write clear BGCSE study notes for "${topic}" in ${subject}. Return ONLY valid JSON:
{"summary":"2-3 sentence overview","keyPoints":["point 1","point 2","point 3","point 4","point 5"],"definitions":[{"term":"word","meaning":"definition"}],"formula":"key formula if applicable (or null)","example":"one quick example","rememberThis":"most important thing to remember for the exam"}`;
  const raw = await callClaude([{role:"user",content:prompt}], "You are a BGCSE teacher in Botswana. Return ONLY raw JSON, no markdown.");
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

async function generateExamQuestion(subject, topic) {
  const prompt = `Create a BGCSE exam-style question for "${topic}" in ${subject}. Return ONLY valid JSON:
{"question":"full question text","marks":4,"type":"structured","parts":[{"part":"(a)","question":"sub question","marks":2,"answer":"model answer","working":"step by step working"},{"part":"(b)","question":"sub question","marks":2,"answer":"model answer","working":"step by step working"}],"examinerNote":"common mistake or tip"}`;
  const raw = await callClaude([{role:"user",content:prompt}], "You are a BGCSE examiner in Botswana. Return ONLY raw JSON, no markdown.");
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

async function chatWithTutor(messages, subject, topic) {
  const system = `You are an expert BGCSE tutor in Botswana helping a student with ${subject}${topic ? `, specifically "${topic}"` : ""}. 
Be encouraging, clear, and use step-by-step explanations. Keep answers concise but complete. Use plain text only.`;
  return callClaude(messages, system);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ w="100%", h=16, mb=8 }) => (
  <div style={{width:w,height:h,marginBottom:mb,borderRadius:5,background:"rgba(255,255,255,0.06)",animation:"shimmer 1.4s infinite"}} />
);

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!code.trim()) { setError("Please enter your access code"); return; }
    setLoading(true);
    setTimeout(() => {
      if (code.trim().toUpperCase() === TEACHER_CODE) {
        onLogin({ name: name.trim(), role: "teacher", code: code.trim().toUpperCase() });
      } else if (VALID_CODES.includes(code.trim().toUpperCase())) {
        onLogin({ name: name.trim(), role: "student", code: code.trim().toUpperCase() });
      } else {
        setError("Invalid access code. Contact your teacher.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080d16", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:28, fontWeight:500, color:"#e0e8ff", marginBottom:6 }}>
            BGCSE<span style={{color:"#3b82f6"}}>.</span>study
          </div>
          <div style={{ color:"#3a4a6a", fontSize:13 }}>Enter your details to continue</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:3, color:"#3a4a6a", marginBottom:8, textTransform:"uppercase" }}>Your Name</div>
            <input value={name} onChange={e=>{setName(e.target.value);setError("");}}
              placeholder="e.g. Thabo Mokoena"
              style={{ width:"100%", padding:"13px 16px", background:"rgba(255,255,255,0.04)", border:"1.5px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#e0e8ff", fontSize:14, fontFamily:"'IBM Plex Sans'", outline:"none" }} />
          </div>
          <div>
            <div style={{ fontFamily:"'IBM Plex Mono'", fontSize:10, letterSpacing:3, color:"#3a4a6a", marginBottom:8, textTransform:"uppercase" }}>Access Code</div>
            <input value={code} onChange={e=>{setCode(e.target.value);setError("");}}
              placeholder="Given by your teacher"
              style={{ width:"100%", padding:"13px 16px", background:"rgba(255,255,255,0.04)", border:`1.5px solid ${error ? "#ff5c8d" : "rgba(255,255,255,0.08)"}`, borderRadius:10, color:"#e0e8ff", fontSize:14, fontFamily:"'IBM Plex Mono'", outline:"none", letterSpacing:2 }}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          {error && <div style={{ color:"#ff5c8d", fontSize:13, textAlign:"center" }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{
            padding:"14px", background: loading ? "#1a2535" : "#3b82f6",
            border:"none", borderRadius:10, color:"#fff", fontWeight:700,
            fontSize:15, cursor: loading ? "default" : "pointer", marginTop:4,
            transition:"background 0.2s",
          }}>
            {loading ? "Checking..." : "Enter →"}
          </button>
        </div>

        <div style={{ textAlign:"center", marginTop:28, color:"#2a3a5a", fontSize:12, fontFamily:"'IBM Plex Mono'" }}>
          Don't have a code? Contact your teacher.
        </div>
      </div>
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────
function NotesTab({ subject, topic, color }) {
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setNotes(null);
    try { setNotes(await generateNotes(subject, topic)); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [topic]);

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {loading && <div>{[100,80,60,90,70].map((w,i)=><Skel key={i} w={`${w}%`} h={i===0?20:14} mb={12}/>)}</div>}
      {notes && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Summary */}
          <div style={{background:`${color}0d`,border:`1.5px solid ${color}30`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color,marginBottom:8,textTransform:"uppercase"}}>Overview</div>
            <div style={{color:"#c0d0e8",fontSize:14,lineHeight:1.7}}>{notes.summary}</div>
          </div>

          {/* Key Points */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#5a6a8a",marginBottom:12,textTransform:"uppercase"}}>Key Points</div>
            {notes.keyPoints?.map((p,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:6,background:`${color}20`,border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color,flexShrink:0,fontFamily:"'IBM Plex Mono'",fontWeight:700}}>{i+1}</div>
                <div style={{color:"#b0c0d8",fontSize:14,lineHeight:1.6}}>{p}</div>
              </div>
            ))}
          </div>

          {/* Formula */}
          {notes.formula && (
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px 18px",display:"flex",gap:14,alignItems:"center"}}>
              <div style={{fontSize:20,color:"#4a5a7a"}}>ƒ</div>
              <div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3a4a6a",marginBottom:4,textTransform:"uppercase"}}>Formula</div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:15,color:"#a0c0e0"}}>{notes.formula}</div>
              </div>
            </div>
          )}

          {/* Definitions */}
          {notes.definitions?.length > 0 && (
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 18px"}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#5a6a8a",marginBottom:12,textTransform:"uppercase"}}>Key Definitions</div>
              {notes.definitions.map((d,i)=>(
                <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<notes.definitions.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <span style={{color,fontWeight:600,fontSize:13}}>{d.term}: </span>
                  <span style={{color:"#8a9ab8",fontSize:13}}>{d.meaning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Remember This */}
          {notes.rememberThis && (
            <div style={{background:"rgba(240,165,0,0.07)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:12,padding:"14px 18px"}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#f0a500",marginBottom:6,textTransform:"uppercase"}}>⭐ Remember This</div>
              <div style={{color:"#c0a060",fontSize:13,lineHeight:1.6}}>{notes.rememberThis}</div>
            </div>
          )}

          <button onClick={load} style={{padding:"11px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#6a7a9a",fontSize:13,cursor:"pointer"}}>
            Regenerate Notes ↺
          </button>
        </div>
      )}
    </div>
  );
}

// ── Exam Questions Tab ────────────────────────────────────────────────────────
function ExamTab({ subject, topic, color, student, onResult }) {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState({});
  const [score, setScore] = useState(null);
  const [selfMark, setSelfMark] = useState({});

  const load = async () => {
    setLoading(true); setExam(null); setRevealed({}); setScore(null); setSelfMark({});
    try { setExam(await generateExamQuestion(subject, topic)); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [topic]);

  const revealPart = (i) => setRevealed(r=>({...r,[i]:true}));

  const markPart = (i, got) => {
    const newMark = {...selfMark,[i]:got};
    setSelfMark(newMark);
    if (exam?.parts && Object.keys(newMark).length === exam.parts.length) {
      const total = exam.parts.reduce((s,p)=>s+p.marks,0);
      const got2 = Object.values(newMark).reduce((a,b)=>a+b,0);
      const pct = Math.round((got2/total)*100);
      setScore({got:got2,total,pct});
      if (onResult) onResult({ subject, topic, score: got2, total, pct, date: new Date().toISOString() });
    }
  };

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {loading && <div>{[90,70,100,60,80].map((w,i)=><Skel key={i} w={`${w}%`} h={i===0?20:14} mb={14}/>)}</div>}
      {exam && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3a4a6a",textTransform:"uppercase"}}>Exam Question</div>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:11,color,background:`${color}18`,border:`1px solid ${color}44`,borderRadius:100,padding:"3px 10px"}}>[{exam.marks} marks]</div>
          </div>

          <div style={{background:`${color}0d`,border:`1.5px solid ${color}30`,borderRadius:12,padding:"16px 18px",marginBottom:20}}>
            <div style={{color:"#d0daea",fontSize:15,lineHeight:1.7}}>{exam.question}</div>
          </div>

          {exam.parts?.map((part,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 18px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <span style={{fontFamily:"'IBM Plex Mono'",fontSize:12,color,fontWeight:700}}>{part.part} </span>
                  <span style={{color:"#c0d0e8",fontSize:14}}>{part.question}</span>
                </div>
                <span style={{fontFamily:"'IBM Plex Mono'",fontSize:11,color:"#3a4a6a",flexShrink:0,marginLeft:10}}>[{part.marks}m]</span>
              </div>

              {!revealed[i] ? (
                <button onClick={()=>revealPart(i)} style={{padding:"9px 18px",background:`${color}18`,border:`1px solid ${color}44`,borderRadius:8,color,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans'"}}>
                  Show Model Answer & Working
                </button>
              ) : (
                <div style={{animation:"fadeIn 0.3s ease"}}>
                  <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                    <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:2,color:"#3a4a6a",marginBottom:6,textTransform:"uppercase"}}>Working</div>
                    <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12,color:"#7a9a8a",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{part.working}</div>
                  </div>
                  <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
                    <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:2,color:"#4ade80",marginBottom:4,textTransform:"uppercase"}}>Model Answer</div>
                    <div style={{color:"#90c090",fontSize:13,lineHeight:1.6}}>{part.answer}</div>
                  </div>

                  {!selfMark[i] && selfMark[i] !== 0 && (
                    <div>
                      <div style={{color:"#5a6a8a",fontSize:12,marginBottom:8,fontFamily:"'IBM Plex Mono'"}}>How many marks did you get?</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {[...Array(part.marks+1)].map((_,m)=>(
                          <button key={m} onClick={()=>markPart(i,m)} style={{padding:"7px 16px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#8a9ab8",fontSize:13,cursor:"pointer"}}>
                            {m}/{part.marks}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(selfMark[i] !== undefined) && (
                    <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12,color:"#4ade80"}}>✓ Marked: {selfMark[i]}/{part.marks}</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {score && (
            <div style={{background:score.pct>=70?"rgba(74,222,128,0.1)":score.pct>=40?"rgba(240,165,0,0.1)":"rgba(255,92,141,0.1)",border:`1.5px solid ${score.pct>=70?"#4ade80":score.pct>=40?"#f0a500":"#ff5c8d"}`,borderRadius:12,padding:"18px 20px",marginBottom:16,animation:"fadeIn 0.4s ease"}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:11,color:score.pct>=70?"#4ade80":score.pct>=40?"#f0a500":"#ff5c8d",marginBottom:6,textTransform:"uppercase",letterSpacing:2}}>Your Score</div>
              <div style={{fontSize:32,fontWeight:700,color:"#e0e8ff",marginBottom:4}}>{score.got}/{score.total}</div>
              <div style={{color:"#6a7a9a",fontSize:13}}>{score.pct}% · {score.pct>=70?"Well done! 🎉":score.pct>=40?"Good effort — review the working above 📖":"Keep practising — study the notes first 💪"}</div>
            </div>
          )}

          {exam.examinerNote && (
            <div style={{background:"rgba(240,165,0,0.07)",border:"1px solid rgba(240,165,0,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:2,color:"#f0a500",marginBottom:4,textTransform:"uppercase"}}>💡 Examiner Note</div>
              <div style={{color:"#b09050",fontSize:13,lineHeight:1.6}}>{exam.examinerNote}</div>
            </div>
          )}

          <button onClick={load} style={{padding:"12px 28px",background:color,border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            New Question →
          </button>
        </div>
      )}
    </div>
  );
}

// ── AI Tutor Tab ──────────────────────────────────────────────────────────────
function TutorTab({ subject, topic, color, studentName }) {
  const [messages, setMessages] = useState([{role:"assistant",content:`Hi ${studentName}! 👋 I'm your BGCSE AI tutor. I'm here to help you with **${topic}** in ${subject}. Ask me anything — questions, explanations, or "I don't understand..." and I'll help!`}]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs = [...messages,{role:"user",content:text}];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const apiMsgs = newMsgs.map(m=>({role:m.role,content:m.content}));
      const reply = await chatWithTutor(apiMsgs, subject, topic);
      setMessages(m=>[...m,{role:"assistant",content:reply}]);
    } catch {
      setMessages(m=>[...m,{role:"assistant",content:"Sorry, I had trouble connecting. Please try again!"}]);
    }
    setLoading(false);
  };

  const quickPrompts = [`Explain ${topic} simply`, "Give me a worked example", "What are common mistakes?", "How does this appear in exams?"];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:400}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,paddingBottom:16}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"85%",background:m.role==="user"?`linear-gradient(135deg,${color},${color}aa)`:"rgba(255,255,255,0.05)",border:m.role==="user"?"none":"1px solid rgba(255,255,255,0.08)",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"12px 16px",color:m.role==="user"?"#fff":"#c0d0e8",fontSize:14,lineHeight:1.65}}>
              {m.content.split("**").map((p,j)=>j%2===1?<strong key={j} style={{color:m.role==="user"?"#fff":color}}>{p}</strong>:p)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:"flex",gap:5,padding:"8px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px 16px 16px 4px",width:"fit-content"}}>
            {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:color,animation:`bounce 1s ${i*0.15}s infinite`}}/>)}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {messages.length === 1 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {quickPrompts.map(p=>(
            <button key={p} onClick={()=>{setInput(p);}} style={{padding:"7px 12px",background:"rgba(255,255,255,0.04)",border:`1px solid ${color}33`,borderRadius:100,color:"#6a7a9a",fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans'"}}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:8,background:"rgba(255,255,255,0.04)",border:"1.5px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"4px 4px 4px 14px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Ask your tutor anything..."
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e0e8ff",fontSize:14,fontFamily:"'IBM Plex Sans'",padding:"10px 0"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{padding:"10px 18px",background:loading||!input.trim()?"#1a2535":color,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:16,cursor:loading||!input.trim()?"default":"pointer",transition:"background 0.2s"}}>↑</button>
      </div>
    </div>
  );
}

// ── Results / Progress ────────────────────────────────────────────────────────
function ResultsView({ student }) {
  const results = storage.get(`results_${student.code}`) || [];
  const bySubject = SUBJECTS.map(s=>({
    ...s,
    results: results.filter(r=>r.subject===s.label),
  }));
  const overall = results.length > 0 ? Math.round(results.reduce((a,r)=>a+r.pct,0)/results.length) : null;

  return (
    <div style={{animation:"fadeIn 0.3s ease",padding:"0 0 60px"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3a4a6a",marginBottom:6,textTransform:"uppercase"}}>Your Progress</div>
        <div style={{fontFamily:"'Lora',serif",fontSize:22,fontStyle:"italic",color:"#e0e8ff"}}>{student.name}</div>
      </div>

      {results.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",color:"#3a4a6a"}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12}}>No exam results yet.</div>
          <div style={{fontSize:13,marginTop:6}}>Complete exam questions to see your progress here.</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Overall */}
          <div style={{background:"rgba(59,130,246,0.08)",border:"1.5px solid rgba(59,130,246,0.2)",borderRadius:14,padding:"20px",textAlign:"center"}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3b82f6",marginBottom:6,textTransform:"uppercase"}}>Overall Average</div>
            <div style={{fontSize:48,fontWeight:700,color:"#e0e8ff",lineHeight:1}}>{overall}%</div>
            <div style={{color:"#4a5a7a",fontSize:13,marginTop:4}}>{results.length} questions answered</div>
          </div>

          {/* By subject */}
          {bySubject.filter(s=>s.results.length>0).map(s=>{
            const avg = Math.round(s.results.reduce((a,r)=>a+r.pct,0)/s.results.length);
            return (
              <div key={s.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${s.color}22`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:18}}>{s.icon}</span>
                    <span style={{fontWeight:600,color:"#c0d0e8",fontSize:15}}>{s.label}</span>
                  </div>
                  <div style={{fontFamily:"'IBM Plex Mono'",fontSize:14,color:avg>=70?"#4ade80":avg>=40?"#f0a500":"#ff5c8d",fontWeight:700}}>{avg}%</div>
                </div>
                {/* Progress bar */}
                <div style={{height:6,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden",marginBottom:10}}>
                  <div style={{height:"100%",width:`${avg}%`,background:avg>=70?"#4ade80":avg>=40?"#f0a500":"#ff5c8d",borderRadius:3,transition:"width 0.6s ease"}}/>
                </div>
                {/* Recent results */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {s.results.slice(-8).map((r,i)=>(
                    <div key={i} title={`${r.topic}: ${r.pct}%`} style={{width:28,height:28,borderRadius:6,background:r.pct>=70?"rgba(74,222,128,0.15)":r.pct>=40?"rgba(240,165,0,0.15)":"rgba(255,92,141,0.15)",border:`1px solid ${r.pct>=70?"#4ade80":r.pct>=40?"#f0a500":"#ff5c8d"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:r.pct>=70?"#4ade80":r.pct>=40?"#f0a500":"#ff5c8d",fontFamily:"'IBM Plex Mono'"}}>
                      {r.pct}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Recent activity */}
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3a4a6a",marginBottom:12,textTransform:"uppercase"}}>Recent Activity</div>
            {results.slice(-5).reverse().map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<4?"1px solid rgba(255,255,255,0.04)":"none"}}>
                <div>
                  <div style={{color:"#8a9ab8",fontSize:13}}>{r.topic}</div>
                  <div style={{color:"#3a4a6a",fontSize:11,fontFamily:"'IBM Plex Mono'"}}>{r.subject} · {new Date(r.date).toLocaleDateString()}</div>
                </div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:13,fontWeight:700,color:r.pct>=70?"#4ade80":r.pct>=40?"#f0a500":"#ff5c8d"}}>{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher Dashboard ─────────────────────────────────────────────────────────
function TeacherDashboard({ onLogout }) {
  const allResults = [];
  VALID_CODES.forEach(code => {
    const r = storage.get(`results_${code}`) || [];
    r.forEach(res => allResults.push({...res, code}));
  });

  const bySubject = SUBJECTS.map(s=>({
    ...s,
    results: allResults.filter(r=>r.subject===s.label),
    avg: allResults.filter(r=>r.subject===s.label).length > 0
      ? Math.round(allResults.filter(r=>r.subject===s.label).reduce((a,r)=>a+r.pct,0)/allResults.filter(r=>r.subject===s.label).length)
      : null,
  }));

  return (
    <div style={{minHeight:"100vh",background:"#080d16",fontFamily:"'IBM Plex Sans',sans-serif",color:"#e0e8ff"}}>
      <header style={{padding:"14px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(8,13,22,0.95)"}}>
        <div style={{fontFamily:"'IBM Plex Mono'",fontSize:15,fontWeight:500}}>BGCSE<span style={{color:"#3b82f6"}}>.</span>study <span style={{color:"#3a4a6a",fontSize:11}}>/ Teacher</span></div>
        <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,padding:"6px 14px",color:"#5a6a8a",fontSize:12,cursor:"pointer"}}>Logout</button>
      </header>
      <div style={{maxWidth:680,margin:"0 auto",padding:"28px 20px 60px"}}>
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"'Lora',serif",fontSize:24,fontStyle:"italic",marginBottom:4}}>Teacher Dashboard</div>
          <div style={{color:"#3a4a6a",fontSize:13,fontFamily:"'IBM Plex Mono'"}}>Access codes: {VALID_CODES.join(", ")}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
          {[
            {label:"Total Attempts",value:allResults.length,color:"#3b82f6"},
            {label:"Overall Avg",value:allResults.length>0?`${Math.round(allResults.reduce((a,r)=>a+r.pct,0)/allResults.length)}%`:"—",color:"#4ade80"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${s.color}22`,borderRadius:12,padding:"18px 16px"}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:3,color:"#3a4a6a",marginBottom:8,textTransform:"uppercase"}}>{s.label}</div>
              <div style={{fontSize:28,fontWeight:700,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {bySubject.map(s=>(
            <div key={s.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${s.color}22`,borderRadius:12,padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:s.results.length>0?12:0}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span>{s.icon}</span>
                  <span style={{fontWeight:600,fontSize:15}}>{s.label}</span>
                  <span style={{fontFamily:"'IBM Plex Mono'",fontSize:11,color:"#3a4a6a"}}>{s.results.length} attempts</span>
                </div>
                {s.avg!==null&&<div style={{fontFamily:"'IBM Plex Mono'",fontSize:14,fontWeight:700,color:s.avg>=70?"#4ade80":s.avg>=40?"#f0a500":"#ff5c8d"}}>{s.avg}% avg</div>}
              </div>
              {s.results.length>0&&(
                <div style={{height:5,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${s.avg}%`,background:s.avg>=70?"#4ade80":s.avg>=40?"#f0a500":"#ff5c8d",borderRadius:3}}/>
                </div>
              )}
            </div>
          ))}
        </div>

        {allResults.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#3a4a6a"}}>
            <div style={{fontSize:36,marginBottom:12}}>📊</div>
            <div style={{fontFamily:"'IBM Plex Mono'",fontSize:12}}>No student results yet.</div>
            <div style={{fontSize:13,marginTop:6}}>Share access codes with students to see their progress here.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState(null);
  const [topic, setTopic] = useState(null);
  const [tab, setTab] = useState("notes");
  const [screen, setScreen] = useState("home");
  const [search, setSearch] = useState("");
  const [bottomTab, setBottomTab] = useState("learn"); // learn | results

  const subjectData = SUBJECTS.find(s=>s.id===subject);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { setUser(null); setSubject(null); setTopic(null); setScreen("home"); };

  const saveResult = (result) => {
    const key = `results_${user.code}`;
    const existing = storage.get(key) || [];
    storage.set(key, [...existing, result]);
  };

  if (!user) return <LoginScreen onLogin={handleLogin}/>;
  if (user.role==="teacher") return <TeacherDashboard onLogout={handleLogout}/>;

  return (
    <div style={{minHeight:"100vh",background:"#080d16",fontFamily:"'IBM Plex Sans',sans-serif",color:"#e0e8ff",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Lora:ital,wght@0,600;1,600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer-bg{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
        @keyframes bounce{0%,100%{transform:translateY(0);opacity:0.5}50%{transform:translateY(-4px);opacity:1}}
        .topic-row:hover{background:rgba(255,255,255,0.05)!important;}
        .subj-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.15)!important;}
      `}</style>

      {/* Header */}
      <header style={{padding:"0 16px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(8,13,22,0.97)",position:"sticky",top:0,zIndex:100}}>
        <div style={{cursor:"pointer",fontFamily:"'IBM Plex Mono'",fontSize:14,fontWeight:500}} onClick={()=>{setScreen("home");setSubject(null);setTopic(null);setBottomTab("learn");}}>
          BGCSE<span style={{color:"#3b82f6"}}>.</span>study
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {topic && <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:"#3a4a6a",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topic}</div>}
          <button onClick={handleLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,padding:"5px 10px",color:"#4a5a7a",fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono'"}}>
            {user.name.split(" ")[0]}
          </button>
        </div>
      </header>

      <main style={{flex:1,maxWidth:680,width:"100%",margin:"0 auto",padding:"20px 16px 90px",overflowY:"auto"}}>

        {/* HOME */}
        {screen==="home" && bottomTab==="learn" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{marginBottom:28}}>
              <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,letterSpacing:4,color:"#3a4a6a",marginBottom:8,textTransform:"uppercase"}}>Welcome back</div>
              <div style={{fontFamily:"'Lora',serif",fontSize:26,fontStyle:"italic",color:"#e0e8ff",marginBottom:4}}>{user.name}</div>
              <div style={{color:"#4a5a7a",fontSize:13}}>Choose a subject to study</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {SUBJECTS.map((s,i)=>(
                <div key={s.id} className="subj-card" onClick={()=>{setSubject(s.id);setScreen("topics");setSearch("");}} style={{background:`linear-gradient(135deg,${s.color}14,rgba(8,13,22,0.8))`,border:`1.5px solid ${s.color}22`,borderRadius:14,padding:"20px 16px",cursor:"pointer",transition:"all 0.2s",animation:`fadeIn 0.4s ease ${i*0.07}s both`}}>
                  <div style={{fontSize:24,marginBottom:8,fontFamily:"'IBM Plex Mono'"}}>{s.icon}</div>
                  <div style={{fontWeight:700,fontSize:15,color:"#e0e8ff",marginBottom:4}}>{s.label}</div>
                  <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:s.color}}>{s.topics.length} topics</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {bottomTab==="results" && <ResultsView student={user}/>}

        {/* TOPICS */}
        {screen==="topics" && subjectData && bottomTab==="learn" && (
          <div style={{animation:"fadeIn 0.35s ease"}}>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
              <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:"#3a4a6a",cursor:"pointer",fontSize:18,padding:"4px"}}>←</button>
              <div>
                <div style={{fontFamily:"'Lora',serif",fontSize:22,fontStyle:"italic",color:"#e0e8ff"}}>{subjectData.label}</div>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:"#3a4a6a"}}>{subjectData.topics.length} topics</div>
              </div>
            </div>
            <div style={{position:"relative",marginBottom:16}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics..."
                style={{width:"100%",padding:"11px 14px 11px 38px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e0e8ff",fontSize:14,fontFamily:"'IBM Plex Sans'",outline:"none"}}/>
              <div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",color:"#3a4a6a",fontSize:14}}>⌕</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {subjectData.topics.filter(t=>t.toLowerCase().includes(search.toLowerCase())).map((t,i)=>(
                <button key={t} className="topic-row" onClick={()=>{setTopic(t);setTab("notes");setScreen("learn");}} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:9,padding:"13px 16px",cursor:"pointer",textAlign:"left",color:"#a0b0c8",fontSize:14,display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s",fontFamily:"'IBM Plex Sans'",animation:`fadeIn 0.3s ease ${Math.min(i,6)*0.03}s both`}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:"#2a3a55",minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
                    {t}
                  </div>
                  <span style={{color:subjectData.color}}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LEARN */}
        {screen==="learn" && subjectData && topic && bottomTab==="learn" && (
          <div style={{animation:"fadeIn 0.3s ease"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
              <button onClick={()=>setScreen("topics")} style={{background:"none",border:"none",color:"#3a4a6a",cursor:"pointer",fontSize:18,padding:"4px"}}>←</button>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'IBM Plex Mono'",fontSize:10,color:subjectData.color,textTransform:"uppercase",letterSpacing:2,marginBottom:2}}>{subjectData.label}</div>
                <div style={{fontFamily:"'Lora',serif",fontSize:18,fontStyle:"italic",color:"#e0e8ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{topic}</div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{display:"flex",gap:4,marginBottom:20,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:4}}>
              {[["notes","📘 Notes"],["exam","📝 Exam Q"],["tutor","🤖 Tutor"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 4px",border:"none",borderRadius:8,background:tab===id?subjectData.color:"transparent",color:tab===id?"#fff":"#5a6a8a",fontSize:12,cursor:"pointer",fontWeight:tab===id?700:400,transition:"all 0.2s",fontFamily:"'IBM Plex Sans'"}}>
                  {lbl}
                </button>
              ))}
            </div>

            {tab==="notes" && <NotesTab subject={subjectData.label} topic={topic} color={subjectData.color}/>}
            {tab==="exam" && <ExamTab subject={subjectData.label} topic={topic} color={subjectData.color} student={user} onResult={saveResult}/>}
            {tab==="tutor" && <TutorTab subject={subjectData.label} topic={topic} color={subjectData.color} studentName={user.name.split(" ")[0]}/>}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(8,13,22,0.97)",borderTop:"1px solid rgba(255,255,255,0.06)",padding:"8px 16px 12px",display:"flex",justifyContent:"center",gap:0,zIndex:100}}>
        <div style={{display:"flex",width:"100%",maxWidth:680,gap:4}}>
          {[["learn","📚","Study"],["results","📊","My Results"]].map(([id,icon,lbl])=>(
            <button key={id} onClick={()=>{setBottomTab(id);if(id==="learn"&&screen==="learn"&&!topic)setScreen("home");}} style={{flex:1,padding:"9px 4px 6px",background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",color:bottomTab===id?"#e0e8ff":"#3a4a6a",transition:"color 0.2s"}}>
              <span style={{fontSize:18}}>{icon}</span>
              <span style={{fontFamily:"'IBM Plex Mono'",fontSize:9,letterSpacing:1,textTransform:"uppercase"}}>{lbl}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
