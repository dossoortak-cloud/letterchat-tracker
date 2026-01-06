import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/find");
        } catch (err) {
            setError("Giriş başarısız! Bilgileri kontrol edin.");
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', flexDirection: 'column' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '300px', textAlign: 'center' }}>
                <h2 style={{ color: '#7b13d1', marginBottom: '1rem' }}>LetterChat Takip</h2>
                {error && <p style={{ color: 'red', fontSize: '0.8rem' }}>{error}</p>}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                    />
                    <input
                        type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                    />
                    <button type="submit" style={{ padding: '10px', backgroundColor: '#7b13d1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                        GİRİŞ YAP
                    </button>
                </form>
            </div>
        </div>
    );
}