// FILE PATH: src/middleware/validate.ts
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten(),
      });
      return;
    }

    req.validated = result.data;
    next();
  };
}

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().email().max(255),
    password: z.string().min(8).max(128),
    companyName: z.string().trim().min(1).max(100),
  }),
});

export const twoFaSchema = z.object({
  body: z.object({
    code: z.string().min(6).max(12),
  }),
});

export const createPostSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200),
    caption: z.string().max(5000),
    platforms: z.array(z.string()).min(1),
    status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
    type: z.enum(['image', 'video', 'text']).default('image'),
    scheduledFor: z.string().datetime().nullable().optional(),
  }),
});

export const createSchedulerSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200),
    platforms: z.array(z.string()).min(1),
    scheduledFor: z.string().datetime(),
    status: z.enum(['draft', 'scheduled']).default('scheduled'),
    postId: z.string().nullable().optional(),
  }),
});

export const updatePlatformSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1), platformId: z.string().min(1) }),
  body: z.object({
    bio: z.string().max(500).optional(),
    website: z.string().url().max(500).optional(),
    account: z.string().max(200).optional(),
  }),
});

export const workspaceParamSchema = z.object({
  params: z.object({ workspaceId: z.string().min(1) }),
});

export const postParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1),
    postId: z.string().min(1),
  }),
});

export const schedulerParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1),
    slotId: z.string().min(1),
  }),
});

export const notificationParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1),
    notificationId: z.string().min(1),
  }),
});

export const platformParamSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1),
    platformId: z.string().min(1),
  }),
});