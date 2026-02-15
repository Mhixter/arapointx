import SupportChat from "@/components/SupportChat";

export default function Chat() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">Support Chat</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Get instant help from our AI and human support agents.</p>
      </div>

      <SupportChat />
    </div>
  );
}
