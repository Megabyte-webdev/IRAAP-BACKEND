import { relations } from "drizzle-orm";
import { projects, reviews, reviewTasks } from "./schema.js";

export const reviewsRelations = relations(reviews, ({ many }) => ({
  tasks: many(reviewTasks),
}));

export const reviewTasksRelations = relations(reviewTasks, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewTasks.reviewId],
    references: [reviews.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsProjectRelation = relations(reviews, ({ one }) => ({
  project: one(projects, {
    fields: [reviews.projectId],
    references: [projects.id],
  }),
}));
