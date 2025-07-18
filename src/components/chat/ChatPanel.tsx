"use client";

import ChatInput from "@/components/chat/ChatInput";
import FullMessageModal from "@/components/chat/FullMessageModal";
import Message from "@/components/chat/Message";
import SystemMessage from "@/components/chat/SystemMessage";
import { SOCKET_NAMESPACES } from "@/constants/socket/namespaces";
import { EventWrapper } from "@/game/event/EventBus";
import { playerStore } from "@/game/managers/player-store";
import { socketManager } from "@/game/managers/socket-manager";
import { linkify } from "@/game/utils/inkify";
import { replaceBadWords } from "@/game/utils/text-filter";
import { useModal } from "@/hook/useModal";
import { useIsMobile } from "@/hook/useIsMobile";
import Alert from "@/utils/alert";
import { getItem } from "@/utils/persistence";
import {
  MessageSent,
  PlayerJoinResponse,
  PlayerLeftResponse,
  ReceiveMessage,
} from "mmorntype";
import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  avatarKey?: string;
  isSystem?: boolean;
}

export default function ChatPanel() {
  const isMobile = useIsMobile();
  const CHAT_THRESHOLD = 500;
  const { isModalOpen, onOpen, onClose } = useModal();
  const [modalMessage, setModalMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [lastChat, setLastChat] = useState(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);
  const [showToBottom, setShowToBottom] = useState(false);

  const [isAtBottom, setIsAtBottom] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [lastSeenMessageId, setLastSeenMessageId] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const nsp = SOCKET_NAMESPACES.ISLAND;

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }

    const container = scrollRef.current;
    if (!container) return;

    const canScroll = container.scrollHeight > container.clientHeight + 1;
    if (!isAtBottom && canScroll) {
      setHasNewMessage(true);
    }
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const container = scrollRef.current;
      if (!container) return;

      const canScroll = container.scrollHeight > container.clientHeight + 1;

      if (!canScroll) {
        setIsAtBottom(true);
        setShowToBottom(false);
        setHasNewMessage(false);
        return;
      }

      const threshold = 100;
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        threshold;

      setIsAtBottom(atBottom);
      setShowToBottom(!atBottom);
      if (atBottom) setHasNewMessage(false);
    };
    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleEscapeDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleEscapeDown);
    return () => {
      window.removeEventListener("keydown", handleEscapeDown);
    };
  }, []);

  useEffect(() => {
    const handleNewPlayer = (data: PlayerJoinResponse) => {
      const message = `${data.nickname} 님이 입장했어요 🏝️`;
      Alert.info(message, false);
      setMessages((prev) => [
        ...prev,
        { id: `system-${Date.now()}`, sender: "", message, isSystem: true },
      ]);
    };

    const handlePlayerLeftChat = (data: PlayerLeftResponse) => {
      const player = playerStore.getPlayer(data.id);
      const info = player?.getPlayerInfo();
      const message = `${info?.nickname ?? "알 수 없음"} 님이 떠났어요 ⛵️`;
      Alert.info(message, false);
      setMessages((prev) => [
        ...prev,
        { id: `system-${Date.now()}`, sender: "", message, isSystem: true },
      ]);
    };

    EventWrapper.onUiEvent("newPlayer", handleNewPlayer);
    EventWrapper.onUiEvent("playerLeftChat", handlePlayerLeftChat);

    const socket = socketManager.connect(nsp);
    if (!socket) return;

    const handleMessageSent = (data: MessageSent) => {
      const profile = getItem("profile");
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          sender: "나",
          message: data.message,
          avatarKey: profile?.avatarKey || "purple_pawn",
        },
      ]);
      EventWrapper.emitToGame("mySpeechBubble", data);
    };

    const handleReceiveMessage = (data: ReceiveMessage) => {
      const player = playerStore.getPlayer(data.senderId);
      const info = player?.getPlayerInfo();
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}${info?.nickname}`,
          sender: info?.nickname || "누군가",
          message: data.message,
          avatarKey: info?.avatarKey || "blue_pawn",
        },
      ]);
      EventWrapper.emitToGame("otherSpeechBubble", data);
    };

    const handleActiveChatInput = () => {
      inputRef?.current?.focus();
    };

    const handleBlurChatInput = () => {
      inputRef?.current?.blur();
    };

    EventWrapper.onUiEvent("activeChatInput", handleActiveChatInput);
    EventWrapper.onUiEvent("blurChatInput", handleBlurChatInput);

    socket.on("messageSent", handleMessageSent);
    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("messageSent", handleMessageSent);
      socket.off("receiveMessage", handleReceiveMessage);
      EventWrapper.offUiEvent("newPlayer", handleNewPlayer);
      EventWrapper.offUiEvent("playerLeftChat", handlePlayerLeftChat);
      EventWrapper.offUiEvent("activeChatInput", handleActiveChatInput);
      EventWrapper.offUiEvent("blurChatInput", handleBlurChatInput);
    };
  }, []);

  const handleSend = (e?: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e?.nativeEvent.isComposing) return;
    if (!input.trim()) {
      inputRef.current?.blur();
      return;
    }

    if (lastChat + CHAT_THRESHOLD > Date.now()) {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          sender: "",
          message: "잠시후 입력해주세요 🙂‍↔️",
          isSystem: true,
        },
      ]);
      return;
    }

    const socket = socketManager.connect(nsp);
    socket?.emit("sendMessage", { message: replaceBadWords(input) });
    setLastChat(Date.now());
    setInput("");
  };

  useEffect(() => {
    if (isMobile && !isChatVisible && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // 내 메시지 무시
      if (!lastMessage || lastMessage.sender === "나") return;

      // 새로운 메시지인 경우만 카운트 증가
      if (lastMessage.id !== lastSeenMessageId) {
        setUnreadCount((prev) => prev + 1);
        setLastSeenMessageId(lastMessage.id);
      }
    }
  }, [messages, isChatVisible, isMobile]);

  useEffect(() => {
    if (isChatVisible && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      setLastSeenMessageId(lastMessage.id);
      setUnreadCount(0);
    }
  }, [isChatVisible, messages]);

  useEffect(() => {
    if (isChatVisible) {
      setUnreadCount(0);
    }
  }, [isChatVisible]);

  return (
    <div
      className={`fixed z-30 transition-all duration-300 ease-in-out
    ${
      isMobile
        ? "bottom-0 left-0 w-full"
        : "group bottom-4 left-4 w-80 rounded-2xl"
    }
    ${isMobile ? "bg-[#f9f5ec]/90" : "bg-transparent hover:bg-[#f9f5ec]/90"}
     flex flex-col overflow-hidden`}
      style={{
        height:
          isMobile && !isChatVisible ? "auto" : isMobile ? "60vh" : "448px",
      }}
    >
      {isMobile && (
        <button
          onClick={() => {
            setIsChatVisible((prev) => !prev);
            scrollToBottom();
          }}
          className="text-[#2a1f14] p-2 text-sm font-bold flex justify-center items-center gap-2 border-b border-[#d6c6aa]"
        >
          {isChatVisible ? (
            <FiChevronDown size={18} />
          ) : (
            <FiChevronUp size={18} />
          )}

          <span className="relative inline-flex items-center">
            {isChatVisible ? "채팅 숨기기" : "채팅 보기"}
            {!isChatVisible && unreadCount > 0 && (
              <span className="w-[20px] h-[20px] text-[10px] ml-1 text-white bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 space-y-3 text-sm text-[#2a1f14] scrollbar-hide transition-opacity duration-200 ${
          isMobile && !isChatVisible ? " hidden" : "flex flex-col"
        }`}
      >
        {messages.map((msg) =>
          msg.isSystem ? (
            <SystemMessage key={msg.id} message={msg.message} />
          ) : (
            <Message
              key={msg.id}
              isMine={msg.sender === "나"}
              avatarKey={msg.avatarKey || "purple_pawn"}
              sender={msg.sender}
              message={msg.message}
              linkify={linkify}
              onOpenModal={() => {
                setModalMessage(msg.message);
                onOpen();
              }}
            />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {(!isMobile && hasNewMessage) ||
      (isMobile && isChatVisible && hasNewMessage) ? (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-10 animate-pulse"
        >
          새로운 메시지
        </button>
      ) : null}

      {(!isMobile && showToBottom) ||
      (isMobile && isChatVisible && showToBottom) ? (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-4 w-9 h-9 flex items-center justify-center bg-black/60 text-white rounded-full shadow hover:bg-black/80 transition"
        >
          <FiChevronDown size={18} />
        </button>
      ) : null}

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        inputRef={inputRef}
      />

      {isModalOpen && (
        <FullMessageModal
          onClose={onClose}
          message={modalMessage}
          linkify={linkify}
        />
      )}
    </div>
  );
}
