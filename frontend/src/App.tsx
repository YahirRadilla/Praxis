import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Inicio from "./pages/Inicio";
import EditProfile from "./pages/EditProfile";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import Explore from "./pages/Explore";
import ProjectDetail from "./pages/ProjectDetail";
import MisProyectos from "./pages/MisProyectos";
import SolicitudesRecibidas from "./pages/SolicitudesRecibidas";
import Equipos from "./pages/Equipos";
import Guardados from "./pages/Guardados";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/inicio"
          element={
            <RequireAuth>
              <Inicio />
            </RequireAuth>
          }
        />
        <Route
          path="/mis-proyectos"
          element={
            <RequireAuth>
              <MisProyectos />
            </RequireAuth>
          }
        />
        <Route
          path="/solicitudes-recibidas"
          element={
            <RequireAuth>
              <SolicitudesRecibidas />
            </RequireAuth>
          }
        />
        <Route
          path="/equipos"
          element={
            <RequireAuth>
              <Equipos />
            </RequireAuth>
          }
        />
        <Route
          path="/guardados"
          element={
            <RequireAuth>
              <Guardados />
            </RequireAuth>
          }
        />
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <EditProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/proyectos/nuevo"
          element={
            <RequireAuth>
              <CreateProject />
            </RequireAuth>
          }
        />
        <Route path="/explorar" element={<Explore />} />
        <Route path="/proyectos/:id" element={<ProjectDetail />} />
        <Route
          path="/proyectos/:id/editar"
          element={
            <RequireAuth>
              <EditProject />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
