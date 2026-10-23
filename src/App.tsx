import { Route, Routes, Navigate } from "react-router-dom";
import { RootLayout, TeacherLayout, StudentLayout } from "./layouts/Layouts";
import { RequireTeacher, RequireStudent } from "./layouts/guards";
import Landing from "./pages/Landing";
import TeacherLogin from "./pages/teacher/Login";
import TeacherDashboard from "./pages/teacher/Dashboard";
import Students from "./pages/teacher/Students";
import StudentDetail from "./pages/teacher/StudentDetail";
import Groups from "./pages/teacher/Groups";
import GroupDetail from "./pages/teacher/GroupDetail";
import Tests from "./pages/teacher/Tests";
import TestForm from "./pages/teacher/TestForm";
import Statistics from "./pages/teacher/Statistics";
import Settings from "./pages/Settings";
import StudentLogin from "./pages/student/Login";
import StudentDashboard from "./pages/student/Dashboard";
import TestSetup from "./pages/student/Setup";
import TestRunner from "./pages/student/TestRunner";
import Result from "./pages/student/Result";
import History from "./pages/student/History";
import Profile from "./pages/student/Profile";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Landing />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/student/login" element={<StudentLogin />} />
      </Route>

      <Route element={<RequireTeacher />}>
        <Route element={<TeacherLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/students" element={<Students />} />
          <Route path="/teacher/students/:id" element={<StudentDetail />} />
          <Route path="/teacher/groups" element={<Groups />} />
          <Route path="/teacher/groups/:id" element={<GroupDetail />} />
          <Route path="/teacher/tests" element={<Tests />} />
          <Route path="/teacher/tests/create" element={<TestForm />} />
          <Route path="/teacher/tests/:id/edit" element={<TestForm />} />
          <Route path="/teacher/statistics" element={<Statistics />} />
          <Route path="/teacher/leaderboard" element={<Leaderboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<RequireStudent />}>
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/test/:id/setup" element={<TestSetup />} />
          <Route path="/student/history" element={<History />} />
          <Route path="/student/profile" element={<Profile />} />
          <Route path="/student/leaderboard" element={<Leaderboard />} />
        </Route>
        <Route path="/student/test/:id" element={<TestRunner />} />
        <Route path="/student/result/:attemptId" element={<Result />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
