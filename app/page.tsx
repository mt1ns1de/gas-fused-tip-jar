import CreateJarButton from "./components/CreateJarButton";

export default function Page() {
  return (
    <main className="space-y-6">
      <p className="text-white/70">
        Создай персональный Tip Jar-клон (EIP-1167) с мгновенным переводом чаевых на твой EOA и предохранителями по газу.
      </p>
      <CreateJarButton />
    </main>
  );
}
