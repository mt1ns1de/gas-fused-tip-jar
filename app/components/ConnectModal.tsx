"use client";

import { useEffect } from "react";
import {
  getInjectedProviders,
  installationLinks,
  ProviderId,
  InjectedDescriptor
} from "../lib/walletProviders";

export default function ConnectModal(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: InjectedDescriptor | "install-rabby" | "install-metamask") => void;
}) {
  const { open, onClose, onSelect } = props;

  const list = getInjectedProviders();
  const hasRabby = list.some((p) => p.id === "rabby");
  const hasMeta = list.some((p) => p.id === "metamask");

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const links = installationLinks();

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-baseStroke bg-baseCard p-5 shadow-xl">
          <div className="mb-4 text-lg font-semibold">Выбери кошелёк</div>
          <div className="space-y-3">
            <WalletOption
              label="Rabby Wallet"
              installed={hasRabby}
              onClick={
                hasRabby
                  ? () => onSelect(list.find((p) => p.id === "rabby")!)
                  : () => onSelect("install-rabby")
              }
              hrefInstall={links.rabby}
            />
            <WalletOption
              label="MetaMask"
              installed={hasMeta}
              onClick={
                hasMeta
                  ? () => onSelect(list.find((p) => p.id === "metamask")!)
                  : () => onSelect("install-metamask")
              }
              hrefInstall={links.metamask}
            />
          </div>

          <button
            className="mt-5 w-full btn btn-outline"
            onClick={onClose}
            aria-label="Закрыть"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletOption(props: {
  label: string;
  installed: boolean;
  onClick: () => void;
  hrefInstall: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-baseStroke bg-baseBg p-3">
      <div>
        <div className="font-medium">{props.label}</div>
        <div className="text-xs text-white/60">
          {props.installed ? "Обнаружен" : "Не установлен"}
        </div>
      </div>
      {props.installed ? (
        <button className="btn btn-primary" onClick={props.onClick}>
          Подключить
        </button>
      ) : (
        <a
          className="btn btn-outline"
          href={props.hrefInstall}
          target="_blank"
          rel="noreferrer"
          onClick={props.onClick}
        >
          Установить
        </a>
      )}
    </div>
  );
}
