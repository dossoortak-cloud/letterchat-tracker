import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Bell } from "lucide-react";

// İkon düzeltmesi
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

function ChangeView({ center }) {
    const map = useMap();
    map.setView(center);
    return null;
}

export default function MapViewer() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryUid = searchParams.get("uid");
    const [targetUid, setTargetUid] = useState(queryUid || null);
    const [location, setLocation] = useState(null);
    const [pushToken, setPushToken] = useState(null);
    const [lastSeen, setLastSeen] = useState("");

    useEffect(() => {
        if (!queryUid) {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) setTargetUid(user.uid);
                else navigate("/");
            });
            return () => unsubscribe();
        }
    }, [queryUid, navigate]);

    useEffect(() => {
        if (!targetUid) return;
        const unsub = onSnapshot(doc(db, "users", targetUid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.pushToken) setPushToken(data.pushToken);
                if (data.lastLocation) {
                    setLocation([data.lastLocation.latitude, data.lastLocation.longitude]);
                    if (data.lastLocation.timestamp) {
                        setLastSeen(new Date(data.lastLocation.timestamp.seconds * 1000).toLocaleString());
                    }
                }
            }
        });
        return () => unsub();
    }, [targetUid]);

    const handleRing = async () => {
        if (!pushToken) return alert("Cihaza ulaşılamıyor.");
        if (!confirm("Siren çalsın mı?")) return;
        try {
            await fetch("https://letterchat-server.vercel.app/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: pushToken, title: "🚨 ACİL", body: "Web panelinden alarm tetiklendi!", data: { type: "find_phone" } }),
            });
            alert("Sinyal gönderildi!");
        } catch (e) { alert("Hata oluştu"); }
    };

    return (
        <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
            <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'white', padding: '10px 20px', borderRadius: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div>
                    <h4 style={{ margin: 0, color: '#333' }}>LetterChat Takip</h4>
                    <small style={{ color: '#666' }}>{location ? lastSeen : "Aranıyor..."}</small>
                </div>
                <button onClick={handleRing} style={{ background: 'red', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                    <Bell size={16} /> SİREN
                </button>
            </div>

            {location ? (
                <MapContainer center={location} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                    <Marker position={location} icon={icon}><Popup>Burada!</Popup></Marker>
                    <ChangeView center={location} />
                </MapContainer>
            ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eee' }}>
                    <p>Konum verisi bekleniyor...</p>
                </div>
            )}
        </div>
    );
}