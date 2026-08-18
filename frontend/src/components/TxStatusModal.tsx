import React from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";
import type { TxProgressState } from "../hooks/useContractsData";

interface TxStatusModalProps {
  progress: TxProgressState;
  onClose: () => void;
}

export const TxStatusModal: React.FC<TxStatusModalProps> = ({ progress, onClose }) => {
  if (progress.step === "Idle" || (!progress.isProcessing && progress.step !== "Success" && progress.step !== "Failed")) {
    return null;
  }

  const steps = ["Preparing", "Signing", "Submitting", "Confirming"];
  const currentIdx = steps.indexOf(progress.step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md fade-in">
      <div className="premium-card rounded-2xl max-w-md w-full p-6 space-y-6 border border-[rgba(184,115,51,0.3)] shadow-2xl text-center relative">
        {/* Top Right Close Button for final states */}
        {(progress.step === "Success" || progress.step === "Failed") && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-gray hover:text-[#F7E7CE] hover:bg-white/5 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Status Indicator */}
        <div className="flex justify-center pt-2">
          {progress.step === "Success" ? (
            <div className="w-14 h-14 rounded-2xl bg-[#355E3B]/20 border border-[#355E3B] flex items-center justify-center text-[#A4D2A6]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : progress.step === "Failed" ? (
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#B87333]/20 border border-[#B87333] flex items-center justify-center text-[#B87333]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>

        {/* Status Title & Description */}
        <div className="space-y-2">
          <h3 className="text-xl font-black text-[#F7E7CE]">
            {progress.step === "Success"
              ? "Transaction Confirmed"
              : progress.step === "Failed"
              ? "Transaction Failed"
              : `Step: ${progress.step}`}
          </h3>
          <p className="text-xs text-stone-gray leading-relaxed">{progress.message}</p>
        </div>

        {/* Stepped Progress Bar */}
        {progress.step !== "Success" && progress.step !== "Failed" && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              {steps.map((s, idx) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx <= currentIdx ? "bg-[#B87333]" : "bg-stone-800"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-stone-gray uppercase">
              <span>Simulate</span>
              <span>Sign</span>
              <span>RPC</span>
              <span>Finalize</span>
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {progress.txHash && (
          <div className="p-3 bg-[#121212] rounded-xl border border-[rgba(247,231,206,0.08)] flex items-center justify-between text-xs font-mono">
            <span className="text-stone-gray text-[10px]">TX HASH:</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${progress.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#B87333] hover:underline flex items-center gap-1 font-bold"
            >
              {progress.txHash.slice(0, 8)}...{progress.txHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Close Button for final states */}
        {(progress.step === "Success" || progress.step === "Failed") && (
          <button
            onClick={onClose}
            className="w-full btn-primary py-3 rounded-xl text-xs uppercase tracking-wider font-bold cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};
