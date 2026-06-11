import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] top-[10%] left-[10%]" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[130px] bottom-[10%] right-[10%]" />
      </div>
      <div className="relative z-10 w-full max-w-md flex justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: "#4f46e5",
              colorBackground: "#0f172a",
              colorText: "#f8fafc",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#1e293b",
              colorInputText: "#f8fafc",
            },
            elements: {
              card: "border border-slate-800 shadow-2xl rounded-3xl",
              socialButtonsBlockButton: "border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-bold transition-all border-none cursor-pointer",
              footerActionLink: "text-indigo-400 hover:text-indigo-300 font-bold",
            }
          }}
        />
      </div>
    </div>
  );
}
