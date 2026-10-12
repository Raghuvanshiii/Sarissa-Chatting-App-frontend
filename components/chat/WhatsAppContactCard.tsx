'use client';

import React from 'react';
import { User, MessageSquare, Phone, Mail, Building, ExternalLink } from 'lucide-react';
import { ContactData } from './ContactModal';
import { useChatStore } from '../../store/useChatStore';

interface WhatsAppContactCardProps {
  contact: ContactData;
  isOwn: boolean;
}

export const WhatsAppContactCard: React.FC<WhatsAppContactCardProps> = ({
  contact,
  isOwn,
}) => {
  const { startDirectChat } = useChatStore();

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.userId) {
      startDirectChat(contact.userId);
    } else if (contact.phone) {
      window.open(`tel:${contact.phone}`, '_self');
    } else if (contact.email) {
      window.open(`mailto:${contact.email}`, '_self');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-2xl border p-4 my-1.5 min-w-[260px] max-w-sm shadow-2xs transition select-none ${
        isOwn
          ? 'bg-white/40 border-[#F5BAC6] text-[#2D151D]'
          : 'bg-[#FFF5F7] border-[#F5BAC6] text-[#2D151D]'
      }`}
    >
      {/* Header with Avatar & Details */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#C24A68] to-[#E07A93] text-white flex items-center justify-center font-bold text-base shadow-2xs flex-shrink-0">
          {contact.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            contact.name.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] sm:text-base font-bold truncate">{contact.name}</p>
          {contact.organization && (
            <p className="text-xs sm:text-[13.5px] opacity-75 flex items-center gap-1.5 truncate mt-0.5">
              <Building className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{contact.organization}</span>
            </p>
          )}
          {contact.phone && (
            <p className="text-xs sm:text-[13.5px] opacity-75 flex items-center gap-1.5 truncate mt-0.5">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{contact.phone}</span>
            </p>
          )}
          {contact.email && !contact.phone && (
            <p className="text-xs sm:text-[13.5px] opacity-75 flex items-center gap-1.5 truncate mt-0.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{contact.email}</span>
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className={`my-3.5 border-t ${
          isOwn ? 'border-white/30' : 'border-[#F5BAC6]/70'
        }`}
      />

      {/* Action Button */}
      <button
        type="button"
        onClick={handleMessageClick}
        className={`w-full py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
          isOwn
            ? 'bg-[#C24A68] hover:bg-[#B83253] text-white shadow-2xs'
            : 'bg-[#FFEBF0] hover:bg-[#FCE7EC] text-[#C24A68] border border-[#F5BAC6]'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Message</span>
      </button>
    </div>
  );
};
