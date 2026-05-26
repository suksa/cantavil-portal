import { z } from 'zod';

const requiredString = (msg: string) =>
  z.string({ required_error: msg, invalid_type_error: msg });

export const LoginSchema = z.object({
  dong: requiredString('동을 선택해 주세요.')
    .trim()
    .min(1, '동을 선택해 주세요.')
    .regex(/^\d{2,8}$/, '동 값이 올바르지 않습니다.'),
  ho: requiredString('호를 선택해 주세요.')
    .trim()
    .min(1, '호를 선택해 주세요.')
    .regex(/^\d{3,5}$/, '호 값이 올바르지 않습니다.'),
  nmCstm: requiredString('이름을 입력해 주세요.')
    .trim()
    .min(1, '이름을 입력해 주세요.')
    .max(40, '이름이 너무 깁니다.')
    .regex(/^[가-힣A-Za-z\s.\-]+$/, '이름 형식이 올바르지 않습니다.'),
  noMphn: requiredString('전화번호를 입력해 주세요.')
    .trim()
    .min(10, '전화번호를 입력해 주세요.')
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '전화번호 형식이 올바르지 않습니다.'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const HoQuerySchema = z.object({
  dong: z.string().trim().regex(/^\d{2,8}$/, 'invalid dong'),
});

export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}
