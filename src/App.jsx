import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import MapViewer from "./components/MapViewer";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/find" element={<MapViewer />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;