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
import Retos from "./pages/Retos";
import MisTareas from "./pages/MisTareas";
import RetoDetalle from "./pages/RetoDetalle";
import CrearReto from "./pages/CrearReto";
// import Impacto from "./pages/Impacto"; // desactivado por ahora
import RequireAuth from "./components/RequireAuth";
import RequireAccountType from "./components/RequireAccountType";
import { CHALLENGE_CREATOR_TYPES } from "./utils/challengeCreators";
import NotFound from "./pages/NotFound";

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
        {/* <Route path="/impacto" element={<Impacto />} /> desactivado por ahora */}
        <Route path="/retos" element={<Retos />} />
        <Route
          path="/mis-tareas"
          element={
            <RequireAuth>
              <MisTareas />
            </RequireAuth>
          }
        />
        <Route path="/retos/:id" element={<RetoDetalle />} />
        <Route
          path="/retos/nuevo"
          element={
            <RequireAuth>
              <RequireAccountType
                allowed={CHALLENGE_CREATOR_TYPES}
                redirectTo="/retos"
                message="Solo las organizaciones pueden publicar retos."
              >
                <CrearReto />
              </RequireAccountType>
            </RequireAuth>
          }
        />
        <Route path="/proyectos/:id" element={<ProjectDetail />} />
        <Route path="/proyectos/:id/actividades/:activityId" element={<ProjectDetail />} />
        <Route
          path="/proyectos/:id/editar"
          element={
            <RequireAuth>
              <EditProject />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
