import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Home from "@/pages/home";
import ApplyFellowship from "@/pages/apply-fellowship";
import ApplyClient from "@/pages/apply-client";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/portal/login";

// Employee Portal
import EmployeeDashboard from "@/pages/portal/employee/dashboard";
import EmployeeTime from "@/pages/portal/employee/time";
import EmployeeKanban from "@/pages/portal/employee/kanban";
import EmployeeExpenses from "@/pages/portal/employee/expenses";
import EmployeeTickets from "@/pages/portal/employee/tickets";
import EmployeeLMS from "@/pages/portal/employee/lms";

// Client Portal
import ClientDashboard from "@/pages/portal/client/dashboard";
import ClientFiles from "@/pages/portal/client/files";
import ClientMessages from "@/pages/portal/client/messages";
import ClientTickets from "@/pages/portal/client/tickets";

// Student Portal
import StudentDashboard from "@/pages/portal/student/dashboard";
import StudentCourses from "@/pages/portal/student/courses";
import StudentFiles from "@/pages/portal/student/files";
import StudentAnnouncements from "@/pages/portal/student/announcements";

// Board Portal
import BoardDashboard from "@/pages/portal/board/dashboard";
import BoardMeetings from "@/pages/portal/board/meetings";
import BoardDocuments from "@/pages/portal/board/documents";
import BoardMinutes from "@/pages/portal/board/minutes";
import BoardActionItems from "@/pages/portal/board/action-items";
import BoardConsents from "@/pages/portal/board/consents";
import BoardMembers from "@/pages/portal/board/members";
import BoardFinancials from "@/pages/portal/board/financials";
import BoardRoster from "@/pages/portal/board/roster";
import BoardSettings from "@/pages/portal/board/settings";
import BoardCalendar from "@/pages/portal/board/calendar";
import BoardConflicts from "@/pages/portal/board/conflicts";
import BoardDirectory from "@/pages/portal/board/directory";
import BoardForums from "@/pages/portal/board/forums";
import BoardOnboarding from "@/pages/portal/board/onboarding";
import BoardMinutesDetail from "@/pages/portal/board/minutes-detail";

// Admin Portal
import AdminUsers from "@/pages/portal/admin/users";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/apply/fellowship" component={ApplyFellowship} />
      <Route path="/apply/client" component={ApplyClient} />
      <Route path="/admin" component={Admin} />

      {/* Portal Login */}
      <Route path="/login" component={LoginPage} />

      {/* Employee Portal */}
      <Route path="/portal/employee/dashboard" component={EmployeeDashboard} />
      <Route path="/portal/employee/time" component={EmployeeTime} />
      <Route path="/portal/employee/kanban" component={EmployeeKanban} />
      <Route path="/portal/employee/expenses" component={EmployeeExpenses} />
      <Route path="/portal/employee/tickets" component={EmployeeTickets} />
      <Route path="/portal/employee/lms" component={EmployeeLMS} />

      {/* Client Portal */}
      <Route path="/portal/client/dashboard" component={ClientDashboard} />
      <Route path="/portal/client/files" component={ClientFiles} />
      <Route path="/portal/client/messages" component={ClientMessages} />
      <Route path="/portal/client/tickets" component={ClientTickets} />

      {/* Student Portal */}
      <Route path="/portal/student/dashboard" component={StudentDashboard} />
      <Route path="/portal/student/courses" component={StudentCourses} />
      <Route path="/portal/student/files" component={StudentFiles} />
      <Route path="/portal/student/announcements" component={StudentAnnouncements} />

      {/* Board Portal */}
      <Route path="/portal/board/dashboard" component={BoardDashboard} />
      <Route path="/portal/board/meetings" component={BoardMeetings} />
      <Route path="/portal/board/documents" component={BoardDocuments} />
      <Route path="/portal/board/minutes" component={BoardMinutes} />
      <Route path="/portal/board/action-items" component={BoardActionItems} />
      <Route path="/portal/board/consents" component={BoardConsents} />
      <Route path="/portal/board/members" component={BoardMembers} />
      <Route path="/portal/board/financials" component={BoardFinancials} />
      <Route path="/portal/board/roster" component={BoardRoster} />
      <Route path="/portal/board/settings" component={BoardSettings} />
      <Route path="/portal/board/calendar" component={BoardCalendar} />
      <Route path="/portal/board/conflicts" component={BoardConflicts} />
      <Route path="/portal/board/directory" component={BoardDirectory} />
      <Route path="/portal/board/forums" component={BoardForums} />
      <Route path="/portal/board/onboarding" component={BoardOnboarding} />
      <Route path="/portal/board/minutes/:id" component={BoardMinutesDetail} />

      {/* Admin Portal */}
      <Route path="/portal/admin/users" component={AdminUsers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
