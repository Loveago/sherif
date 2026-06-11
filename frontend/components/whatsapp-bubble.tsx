'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { MessageCircle } from 'lucide-react';

type PublicSettings = {
  momoNumber: string;
  momoName: string;
  momoEnabled: boolean;
  whatsappNumber: string;
};

function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '233' + digits.slice(1);
  }
  if (digits.startsWith('233')) {
    return digits;
  }
  return digits;
}

export function WhatsAppBubble() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => apiRequest<PublicSettings>('/admin/settings/public'),
  });

  const number = settings?.whatsappNumber;
  if (!number) return null;

  const normalized = normalizeWhatsAppNumber(number);
  const waLink = `https://wa.me/${normalized}`;

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110 hover:shadow-emerald-500/50"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
