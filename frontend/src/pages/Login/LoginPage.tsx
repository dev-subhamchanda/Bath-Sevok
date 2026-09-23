import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Logo } from "@/components/common/Logo";
import { useAuthStore } from "@/stores/authStore";
import { authApi, formatAxiosError } from "@/services/api/apiClient";
import { getApiConfig, pingBackend } from "@/services/apiConfig";
import type { UserRole } from "@/types/domain";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [selectedRole, setSelectedRole] = useState<UserRole>("operator");
  const [username, setUsername] = useState("op.kamrup@ner-transport.gov.in");
  const [password, setPassword] = useState("GuwahatiHub2025!");
  const [fullName, setFullName] = useState("Kamrup Dispatch Operator");
  const [phone, setPhone] = useState("9876543210");
  const [selectedVehicle, setSelectedVehicle] = useState<"heavy" | "four-wheeler" | "two-wheeler">("four-wheeler");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<{ message: string; status?: number; endpoint?: string } | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  const apiConfig = getApiConfig();

  useEffect(() => {
    let active = true;
    pingBackend()
      .then((res) => {
        if (active) setBackendStatus(res.reachable ? "connected" : "disconnected");
      })
      .catch(() => {
        if (active) setBackendStatus("disconnected");
      });
    return () => {
      active = false;
    };
  }, []);

  const rolePresets: Record<UserRole, { label: string; email: string; name: string; badge: string; description: string; idType: string }> = {
    operator: {
      label: "Control Desk Operator",
      email: "op.kamrup@ner-transport.gov.in",
      name: "Kamrup Dispatch Operator",
      badge: "Dispatch Unit",
      description: "Corridor management, telemetry monitoring & rerouting",
      idType: "Govt / Agency ID"
    },
    admin: {
      label: "Regional Authority",
      email: "auth.admin@ner-transport.gov.in",
      name: "Regional Authority HQ Admin",
      badge: "HQ Command",
      description: "Inter-state oversight, corridor clearances & SLA policies",
      idType: "Officer ID / Badge #"
    },
    officer: {
      label: "Field Transit Officer",
      email: "officer.transit@ner-transport.gov.in",
      name: "Field Transit Officer",
      badge: "Transit Post",
      description: "On-site checkpoint reports, hazard telemetry & verification",
      idType: "Station / Unit ID"
    }
  };

  const handleSelectRolePreset = (role: UserRole) => {
    setSelectedRole(role);
    setUsername(rolePresets[role].email);
    setFullName(rolePresets[role].name);
    if (role === "officer") {
      setSelectedVehicle("two-wheeler");
    } else if (role === "operator") {
      setSelectedVehicle("four-wheeler");
    } else if (role === "admin") {
      setSelectedVehicle("heavy");
    }
    setAuthError(null);
  };

  // Direct bypass for Demo/Offline evaluation
  const handleDemoBypass = () => {
    login(username, selectedRole, selectedVehicle);
    navigate("/");
  };

  // Sign In Handler: Actively hits /auth/signin on backend via Axios with seamless offline fallback
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      await authApi.signin({
        email: username,
        password: password
      });

      setAuthSuccess("Authentication successful! Redirecting...");

      // Update local auth store with role & profile
      login(username, selectedRole, selectedVehicle);

      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err: unknown) {
      console.warn("[Auth] Backend sign-in hit failed:", err);
      const isNetworkError = axios.isAxiosError(err) && (!err.response || err.code === "ECONNABORTED");

      if (isNetworkError) {
        // Backend is disconnected for now - seamlessly authenticate with local demo session
        console.info("[Auth] Backend disconnected. Continuing with local demo session.");
        setAuthSuccess("Backend offline. Continuing in local demo session...");
        login(username, selectedRole, selectedVehicle);
        setTimeout(() => {
          navigate("/");
        }, 500);
        return;
      }

      const msg = formatAxiosError(err, "Sign-in request failed.");
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      setAuthError({
        message: msg,
        status,
        endpoint: "/auth/signin"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler: Actively hits /auth/signup on backend via Axios with offline fallback
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const isVehicleRequired = selectedRole === "operator" || selectedRole === "officer";

    try {
      await authApi.signup({
        name: fullName,
        email: username,
        password: password,
        role: selectedRole,
        phone: phone,
        vehicleType: isVehicleRequired ? selectedVehicle : undefined
      });

      setAuthSuccess("Account registered successfully! You can now Sign In.");
      setActiveTab("signin");
    } catch (err: unknown) {
      console.warn("[Auth] Backend /auth/signup hit failed:", err);
      const isNetworkError = axios.isAxiosError(err) && (!err.response || err.code === "ECONNABORTED");

      if (isNetworkError) {
        setAuthSuccess("Backend offline. Account registered for local demo session! You can now Sign In.");
        setActiveTab("signin");
        return;
      }

      const msg = formatAxiosError(err, "Registration request failed.");
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      setAuthError({
        message: msg,
        status,
        endpoint: "/auth/signup"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f9ff] text-[#181c20] flex flex-col items-center justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header / Brand Pill */}
      <div className="w-full max-w-lg flex flex-col items-center text-center pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ebeef4] text-[#42474e] text-xs font-semibold mb-3 border border-[#c2c7cf]/40 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#005148] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#005148]" />
          </span>
          <span>Regional Logistics Gateway • North East India</span>
        </div>

        <div className="flex items-center justify-center gap-3 mb-2 ">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm border border-[#e5e8ee]">
            <Logo size={36} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#003356] tracking-tight uppercase ">
            ZENTRIXA
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#42474e] max-w-md">
          Predict disruptions. Optimize routes. Track critical supplies across challenging terrain corridors.
        </p>

        {/* Backend Status Indicator */}
        <div
          className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#e5e8ee] shadow-xs text-[11px] text-[#42474e]"
          title={apiConfig.httpUrl ? `Backend: ${apiConfig.httpUrl}` : undefined}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === "connected"
                ? "bg-emerald-500 animate-pulse"
                : backendStatus === "checking"
                ? "bg-amber-400 animate-pulse"
                : "bg-slate-400"
            }`}
          />
          <span className="font-semibold text-[#003356]">Backend:</span>
          <span
            className={`text-[11px] font-medium ${
              backendStatus === "connected"
                ? "text-[#005148]"
                : backendStatus === "checking"
                ? "text-amber-700"
                : "text-slate-600"
            }`}
          >
            {backendStatus === "connected"
              ? "Connected"
              : backendStatus === "checking"
              ? "Checking..."
              : "Disconnected (Demo Mode Ready)"}
          </span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,51,86,0.06)] border border-[#e5e8ee] p-6 sm:p-8 my-5">
        {/* Navigation Tabs (Sign In vs Register) */}
        <div className="flex items-center justify-between border-b border-[#e5e8ee] pb-3 mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setAuthError(null);
              }}
              className={`pb-1 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === "signin"
                  ? "border-[#003356] text-[#003356]"
                  : "border-transparent text-[#72777f] hover:text-[#181c20]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setAuthError(null);
              }}
              className={`pb-1 text-xs sm:text-sm font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === "signup"
                  ? "border-[#003356] text-[#003356]"
                  : "border-transparent text-[#72777f] hover:text-[#181c20]"
              }`}
            >
              Register
            </button>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#005148] text-[11px] font-semibold">
            Step 1 of 2
          </span>
        </div>

        {/* Quick Role Presets */}
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-xs font-bold text-[#181c20]">Select Identity Role</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f1f4fa] rounded-xl border border-[#e5e8ee]">
            {(["operator", "admin", "officer"] as UserRole[]).map((r) => {
              const active = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectRolePreset(r)}
                  className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    active
                      ? "bg-[#003356] text-white shadow-xs"
                      : "text-[#42474e] hover:bg-[#ebeef4] hover:text-[#181c20]"
                  }`}
                >
                  <span className="capitalize">{r === "admin" ? "Authority" : r === "operator" ? "Operator" : "Officer"}</span>
                  <span
                    className={`text-[9px] font-normal ${
                      active ? "text-[#cfe4ff]" : "text-[#72777f]"
                    }`}
                  >
                    {r === "admin" ? "HQ Desk" : r === "operator" ? "Control" : "Field"}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[#72777f] mt-0.5">
            {rolePresets[selectedRole].description}
          </span>
        </div>

        {/* Backend Error Alert Banner */}
        {authError && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#ffdad6]/70 border border-[#ba1a1a]/30 text-[#93000a] text-xs flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center justify-between gap-1">
                  <span>Authentication Error {authError.status ? `(${authError.status})` : ""}</span>
                </div>
                <p className="text-[11px] text-[#410002] mt-0.5 font-medium leading-relaxed">
                  {authError.message}
                </p>
              </div>
            </div>

            {/* Seamless 1-click Demo Bypass */}
            <div className="pt-2 border-t border-[#ba1a1a]/20 flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#410002]/80">Unseeded backend account?</span>
              <button
                type="button"
                onClick={handleDemoBypass}
                className="px-2.5 py-1 rounded-lg bg-[#003356] hover:bg-[#174a73] text-white font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs"
                title="Bypass backend credentials and continue with local demo session"
              >
                <span>Continue in Demo Mode</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {authSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-[#e6f4ea] border border-[#005148]/30 text-[#005148] text-xs font-semibold flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={activeTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
          {/* Full Name for Signup */}
          {activeTab === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#181c20]">Full Official Name</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#72777f] text-[18px]">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Officer Name"
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email / Identifier */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#181c20]">
                Official Email / Identifier
              </label>
              <span className="text-[10px] text-[#72777f]">
                {rolePresets[selectedRole].idType}
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#72777f] text-[18px]">
                badge
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter official email or identifier"
                className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Phone for Signup */}
          {activeTab === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#181c20]">Phone Number</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#72777f] text-[18px]">
                  call
                </span>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Official mobile contact"
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Vehicle Selection for Signup (where the selected role requires/uses a vehicle) */}
          {activeTab === "signup" && (selectedRole === "operator" || selectedRole === "officer") && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#181c20]">
                  Assigned Vehicle Profile
                </label>
                <span className="text-[10px] text-[#72777f]">
                  {selectedVehicle === "heavy"
                    ? "Freight / Convoy"
                    : selectedVehicle === "four-wheeler"
                    ? "Utility / 4x4"
                    : "Agile Transit"}
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-[#72777f] text-[18px] pointer-events-none">
                  {selectedVehicle === "heavy"
                    ? "local_shipping"
                    : selectedVehicle === "four-wheeler"
                    ? "directions_car"
                    : "two_wheeler"}
                </span>
                <select
                  value={selectedVehicle}
                  onChange={(e) =>
                    setSelectedVehicle(
                      e.target.value as "heavy" | "four-wheeler" | "two-wheeler"
                    )
                  }
                  className="w-full h-11 pl-9 pr-8 rounded-lg bg-[#f1f4fa] text-xs text-[#181c20] font-medium border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="four-wheeler">Four Wheeler (Utility / 4x4 Pickup)</option>
                  <option value="heavy">Heavy Commercial Freight (Multi-Axle / Cargo)</option>
                  <option value="two-wheeler">Two Wheeler (Agile Transit / Hill Tracks)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-[#72777f] text-[18px] pointer-events-none">
                  expand_more
                </span>
              </div>
              <span className="text-[10px] text-[#72777f]">
                {selectedVehicle === "heavy"
                  ? "Configured for major NH corridors and heavy freight payloads."
                  : selectedVehicle === "four-wheeler"
                  ? "All-weather 4WD capability across multi-district regional arteries."
                  : "Optimized for steep gradient slopes and narrow hill bypasses."}
              </span>
            </div>
          )}

          {/* Password */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#181c20]">Password</label>
              <span className="text-[10px] text-[#72777f]">Encrypted Transit Token</span>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#72777f] text-[18px]">
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-9 pr-10 rounded-lg bg-[#f1f4fa] text-xs text-[#181c20] border border-[#e5e8ee] focus:border-[#174a73] focus:bg-white focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-1.5 text-[#72777f] hover:text-[#181c20] cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {activeTab === "signin" && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#42474e]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#003356] rounded border-gray-300"
                />
                <span>Remember this session</span>
              </label>
              <a
                href="#reset"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Password reset protocol routed to Ministry IT Operations desk.");
                }}
                className="text-[#27638c] hover:underline"
              >
                Forgot password?
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-xl bg-[#003356] hover:bg-[#174a73] disabled:opacity-75 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {activeTab === "signin" ? "Signing In..." : "Registering..."}
                </span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === "signin" ? "Sign In" : "Register"}
                </span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Mode Direct Link */}
        <div className="mt-5 p-3 rounded-xl bg-[#eff6ff] border border-[#cfe4ff] text-xs text-[#1e40af] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] text-[#27638c] shrink-0">
              play_circle
            </span>
            <span className="text-[11px] leading-tight text-[#1e40af]">
              Evaluate with pre-seeded demo state:
            </span>
          </div>
          <button
            type="button"
            onClick={handleDemoBypass}
            className="px-2.5 py-1 rounded-md bg-[#27638c] hover:bg-[#174a73] text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            Enter Demo Mode
          </button>
        </div>
      </div>

      {/* Trust & Security Footnote */}
      <footer className="w-full max-w-lg text-center text-[11px] text-[#72777f] flex flex-col items-center gap-1.5 pb-4">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-[#005148]">verified_user</span>
          <span>Encrypted 256-bit Secure Transit Session • National Gateway</span>
        </div>
        <p>Ministry of Development of North Eastern Region (MDoNER) • SIH26002</p>
      </footer>
    </div>
  );
};
