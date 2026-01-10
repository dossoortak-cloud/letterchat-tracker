import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Bell, Navigation, RefreshCw } from "lucide-react";

// İkon düzeltmeleri
const targetIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const myIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Haritayı Merkeze Odakla
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

    const [targetLocation, setTargetLocation] = useState(null);
    const [myLocation, setMyLocation] = useState(null);
    const [distance, setDistance] = useState(null);

    const [pushToken, setPushToken] = useState(null);
    const [lastSeen, setLastSeen] = useState("");
    const [loadingSiren, setLoadingSiren] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // 1. Giriş Kontrolü
    useEffect(() => {
        if (!queryUid) {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) setTargetUid(user.uid);
                else navigate("/");
            });
            return () => unsubscribe();
        }
    }, [queryUid, navigate]);

    // 2. Hedef Cihazı Dinle
    useEffect(() => {
        if (!targetUid) return;
        const unsub = onSnapshot(doc(db, "users", targetUid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.pushToken) setPushToken(data.pushToken);

                // lastLocation veya location alanını kontrol et
                const loc = data.lastLocation || data.location;

                if (loc) {
                    setTargetLocation([loc.latitude, loc.longitude]);
                    if (loc.timestamp) {
                        // Timestamp formatını kontrol et
                        const date = loc.timestamp.seconds
                            ? new Date(loc.timestamp.seconds * 1000)
                            : new Date(loc.timestamp);
                        setLastSeen(date.toLocaleTimeString());
                    }
                }
            }
        });
        return () => unsub();
    }, [targetUid]);

    // 3. Token Gelince Otomatik Sessiz İstek Gönder (Sayfa açılınca)
    useEffect(() => {
        if (pushToken) {
            requestLocationUpdate();
        }
    }, [pushToken]);

    // 4. Kendi Konumumu Al
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition((position) => {
                setMyLocation([position.coords.latitude, position.coords.longitude]);
            });
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // 5. Mesafe Hesapla
    useEffect(() => {
        if (myLocation && targetLocation) {
            const dist = calculateDistance(myLocation[0], myLocation[1], targetLocation[0], targetLocation[1]);
            setDistance(dist.toFixed(2));
        }
    }, [myLocation, targetLocation]);

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const openNavigation = () => {
        if (targetLocation) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLocation[0]},${targetLocation[1]}&travelmode=driving`;
            window.open(url, '_blank');
        }
    };

    // 🔥 Konum Güncelleme İsteği (SESSİZ)
    const requestLocationUpdate = async () => {
        if (!pushToken) {
            alert("Telefona ulaşılamıyor (Token yok).");
            return;
        }

        setRefreshing(true); // Dönme efekti başlasın

        try {
            await fetch("https://letterchat-server.vercel.app/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: pushToken,
                    title: "", // Sessiz olması için boş
                    body: "",
                    data: { type: "silent_location" } // Mobile bu emri atıyoruz
                }),
            });

            // Kullanıcıya bilgi ver
            console.log("Konum isteği gönderildi...");

            // 5 saniye sonra dönmeyi durdur
            setTimeout(() => {
                setRefreshing(false);
            }, 5000);

        } catch (e) {
            console.log("Update error", e);
            setRefreshing(false);
            alert("İstek gönderilemedi.");
        }
    };

    // ... (Render kısmında başlığı güncelle)

    {/* Üst Bilgi Paneli */ }
    <div style={{ ... }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {queryUid ? "Çocuk / Aile Takip" : "Cihazımı Bul"}

                    {/* 🔥 YENİLEME BUTONU */}
                    <button
                        onClick={requestLocationUpdate}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 5 }}
                        title="Konumu Şimdi Güncelle"
                    >
                        <RefreshCw size={18} className={refreshing ? "spin-anim" : ""} color="#7b13d1" />
                    </button>

                </h3>

    // Alarm Çaldır (SESLİ)
    const handleRing = async () => {
        if (!pushToken) return alert("Cihaza ulaşılamıyor.");
        if (!confirm("⚠️ DİKKAT: Cihazda yüksek sesli ALARM çalacak. Onaylıyor musun?")) return;

        setLoadingSiren(true);
        try {
            await fetch("https://letterchat-server.vercel.app/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: pushToken, title: "🚨 KAYIP CİHAZ", body: "Konum alarmı tetiklendi!", data: { type: "find_phone" } }),
            });
            alert("Sinyal gönderildi!");
        } catch (e) { alert("Hata oluştu"); }
        finally { setLoadingSiren(false); }
    };

    return (
        <div style={{ height: "100vh", width: "100vw", position: "relative", display: "flex", flexDirection: "column" }}>

            {/* Üst Bilgi Paneli */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
                background: 'rgba(255, 255, 255, 0.95)', padding: '15px',
                borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(5px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {queryUid ? "Çocuk / Aile Takip" : "Cihazımı Bul"}
                            <button onClick={requestLocationUpdate} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                <RefreshCw size={16} className={refreshing ? "spin-anim" : ""} color="#7b13d1" />
                            </button>
                        </h3>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                            🕒 Son: {targetLocation ? lastSeen : "Aranıyor..."}
                        </p>
                        {distance && (
                            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#7b13d1', fontWeight: 'bold' }}>
                                📏 Mesafe: {distance < 1 ? `${(distance * 1000).toFixed(0)} metre` : `${distance} km`}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={openNavigation}
                        disabled={!targetLocation}
                        style={{
                            background: '#10b981', color: 'white', border: 'none', padding: '10px 15px',
                            borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 'bold',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Navigation size={20} />
                        YOL TARİFİ
                    </button>
                </div>
            </div>

            {/* Harita */}
            <div style={{ flex: 1 }}>
                {targetLocation ? (
                    <MapContainer center={targetLocation} zoom={15} style={{ height: "100%", width: "100%" }}>
                        <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
                        <Marker position={targetLocation} icon={targetIcon}>
                            <Popup><b>Hedef Burada!</b><br />{lastSeen}</Popup>
                        </Marker>
                        {myLocation && (
                            <Marker position={myLocation} icon={myIcon}>
                                <Popup>Sen Buradasın</Popup>
                            </Marker>
                        )}
                        <ChangeView center={targetLocation} />
                    </MapContainer>
                ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', flexDirection: 'column' }}>
                        <div className="loader" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #7b13d1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ marginTop: '15px', color: '#555' }}>Cihaz konumu bekleniyor...</p>
                        {pushToken && <p style={{ fontSize: '10px', color: '#999' }}>Cihaza sinyal gönderildi...</p>}
                    </div>
                )}
            </div>

            {/* Alt Panel: Siren */}
            <div style={{
                position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                zIndex: 1000, width: '90%', maxWidth: '400px'
            }}>
                <button
                    onClick={handleRing}
                    disabled={!pushToken || loadingSiren}
                    style={{
                        background: 'white', color: '#e53935', border: '2px solid #e53935',
                        padding: '12px', borderRadius: '50px', width: '100%',
                        cursor: !pushToken ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                >
                    <Bell size={18} /> {loadingSiren ? "Sinyal Gidiyor..." : "KAYIP CİHAZ ALARMI (SİREN)"}
                </button>
            </div>

            <style>{`
                @keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}
                .spin-anim { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
