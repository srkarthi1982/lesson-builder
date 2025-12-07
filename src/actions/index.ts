import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import {
  db,
  eq,
  and,
  LessonPlans,
  LessonObjectives,
  LessonSteps,
  LessonMaterials,
  LessonJobs,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createPlan: defineAction({
    input: z.object({
      title: z.string().min(1, "Title is required"),
      subject: z.string().optional(),
      gradeLevel: z.string().optional(),
      overview: z.string().optional(),
      durationMinutes: z.number().int().positive().optional(),
      tags: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .insert(LessonPlans)
        .values({
          ownerId: user.id,
          title: input.title,
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          overview: input.overview,
          durationMinutes: input.durationMinutes,
          tags: input.tags,
          status: input.status ?? "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { plan };
    },
  }),

  updatePlan: defineAction({
    input: z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      subject: z.string().optional(),
      gradeLevel: z.string().optional(),
      overview: z.string().optional(),
      durationMinutes: z.number().int().positive().optional(),
      tags: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, id), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { plan: existing };
      }

      const [plan] = await db
        .update(LessonPlans)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(LessonPlans.id, id), eq(LessonPlans.ownerId, user.id)))
        .returning();

      return { plan };
    },
  }),

  archivePlan: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .update(LessonPlans)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(LessonPlans.id, input.id), eq(LessonPlans.ownerId, user.id)))
        .returning();

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      return { plan };
    },
  }),

  listMyPlans: defineAction({
    input: z
      .object({
        status: z.enum(["draft", "published", "archived"]).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      const plans = await db.select().from(LessonPlans).where(eq(LessonPlans.ownerId, user.id));

      const filtered = input?.status
        ? plans.filter((plan) => plan.status === input.status)
        : plans;

      return { plans: filtered };
    },
  }),

  getPlanWithDetails: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.id), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const objectives = await db
        .select()
        .from(LessonObjectives)
        .where(eq(LessonObjectives.planId, input.id));

      const steps = await db.select().from(LessonSteps).where(eq(LessonSteps.planId, input.id));

      const materials = await db
        .select()
        .from(LessonMaterials)
        .where(eq(LessonMaterials.planId, input.id));

      return { plan, objectives, steps, materials };
    },
  }),

  saveObjective: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      planId: z.number().int(),
      text: z.string().min(1, "Objective text is required"),
      order: z.number().int().positive().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const baseValues = {
        planId: input.planId,
        text: input.text,
        order: input.order ?? 1,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(LessonObjectives)
          .where(eq(LessonObjectives.id, input.id))
          .limit(1);

        if (!existing || existing.planId !== input.planId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Objective not found.",
          });
        }

        const [objective] = await db
          .update(LessonObjectives)
          .set(baseValues)
          .where(eq(LessonObjectives.id, input.id))
          .returning();

        return { objective };
      }

      const [objective] = await db.insert(LessonObjectives).values(baseValues).returning();
      return { objective };
    },
  }),

  deleteObjective: defineAction({
    input: z.object({
      id: z.number().int(),
      planId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const [deleted] = await db
        .delete(LessonObjectives)
        .where(and(eq(LessonObjectives.id, input.id), eq(LessonObjectives.planId, input.planId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Objective not found.",
        });
      }

      return { objective: deleted };
    },
  }),

  saveStep: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      planId: z.number().int(),
      title: z.string().optional(),
      description: z.string().min(1, "Description is required"),
      durationMinutes: z.number().int().positive().optional(),
      order: z.number().int().positive().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const baseValues = {
        planId: input.planId,
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        order: input.order ?? 1,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(LessonSteps)
          .where(eq(LessonSteps.id, input.id))
          .limit(1);

        if (!existing || existing.planId !== input.planId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Lesson step not found.",
          });
        }

        const [step] = await db
          .update(LessonSteps)
          .set(baseValues)
          .where(eq(LessonSteps.id, input.id))
          .returning();

        return { step };
      }

      const [step] = await db.insert(LessonSteps).values(baseValues).returning();
      return { step };
    },
  }),

  deleteStep: defineAction({
    input: z.object({
      id: z.number().int(),
      planId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const [deleted] = await db
        .delete(LessonSteps)
        .where(and(eq(LessonSteps.id, input.id), eq(LessonSteps.planId, input.planId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson step not found.",
        });
      }

      return { step: deleted };
    },
  }),

  saveMaterial: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      planId: z.number().int(),
      name: z.string().min(1, "Name is required"),
      type: z.string().optional(),
      url: z.string().url().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const baseValues = {
        planId: input.planId,
        name: input.name,
        type: input.type,
        url: input.url,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(LessonMaterials)
          .where(eq(LessonMaterials.id, input.id))
          .limit(1);

        if (!existing || existing.planId !== input.planId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Lesson material not found.",
          });
        }

        const [material] = await db
          .update(LessonMaterials)
          .set(baseValues)
          .where(eq(LessonMaterials.id, input.id))
          .returning();

        return { material };
      }

      const [material] = await db.insert(LessonMaterials).values(baseValues).returning();
      return { material };
    },
  }),

  deleteMaterial: defineAction({
    input: z.object({
      id: z.number().int(),
      planId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [plan] = await db
        .select()
        .from(LessonPlans)
        .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
        .limit(1);

      if (!plan) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson plan not found.",
        });
      }

      const [deleted] = await db
        .delete(LessonMaterials)
        .where(and(eq(LessonMaterials.id, input.id), eq(LessonMaterials.planId, input.planId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Lesson material not found.",
        });
      }

      return { material: deleted };
    },
  }),

  createJob: defineAction({
    input: z.object({
      planId: z.number().int().optional(),
      jobType: z.enum(["outline", "objectives", "steps", "materials", "full"]).optional(),
      input: z.any().optional(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.planId) {
        const [plan] = await db
          .select()
          .from(LessonPlans)
          .where(and(eq(LessonPlans.id, input.planId), eq(LessonPlans.ownerId, user.id)))
          .limit(1);

        if (!plan) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Lesson plan not found.",
          });
        }
      }

      const [job] = await db
        .insert(LessonJobs)
        .values({
          planId: input.planId,
          userId: user.id,
          jobType: input.jobType ?? "full",
          input: input.input,
          output: input.output,
          status: input.status ?? "pending",
          createdAt: new Date(),
        })
        .returning();

      return { job };
    },
  }),

  updateJob: defineAction({
    input: z.object({
      id: z.number().int(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(LessonJobs)
        .where(and(eq(LessonJobs.id, input.id), eq(LessonJobs.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (typeof input.output !== "undefined") updateData.output = input.output;
      if (typeof input.status !== "undefined") updateData.status = input.status;

      if (Object.keys(updateData).length === 0) {
        return { job: existing };
      }

      const [job] = await db
        .update(LessonJobs)
        .set(updateData)
        .where(eq(LessonJobs.id, input.id))
        .returning();

      return { job };
    },
  }),

  listJobs: defineAction({
    input: z
      .object({
        planId: z.number().int().optional(),
        status: z.enum(["pending", "completed", "failed"]).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      let plans = await db.select().from(LessonPlans).where(eq(LessonPlans.ownerId, user.id));

      if (input?.planId) {
        plans = plans.filter((p) => p.id === input.planId);
        if (plans.length === 0) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Lesson plan not found.",
          });
        }
      }

      const allowedPlanIds = new Set(plans.map((p) => p.id));

      const jobs = await db
        .select()
        .from(LessonJobs)
        .where(eq(LessonJobs.userId, user.id));

      const filtered = jobs.filter((job) => {
        const matchesPlan = job.planId ? allowedPlanIds.has(job.planId) : true;
        const matchesStatus = input?.status ? job.status === input.status : true;
        return matchesPlan && matchesStatus;
      });

      return { jobs: filtered };
    },
  }),
};
