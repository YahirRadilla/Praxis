import type { Request, Response, NextFunction } from "express";
import * as impactRepository from "../repositories/impact.repository";

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

export async function getImpactHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const [
      totalPublicProjects,
      acceptedTeamRequests,
      projectsWithProgressUpdates,
      projectsWithMultipleMembers,
      projectsWithSignedEvaluation,
      challengesWithProposals,
      projectsByCategory,
      projectsBySdg,
    ] = await Promise.all([
      impactRepository.countPublicProjects(),
      impactRepository.countAcceptedTeamRequests(),
      impactRepository.countPublicProjectsWithProgressUpdates(),
      impactRepository.countPublicProjectsWithMultipleMembers(),
      impactRepository.countPublicProjectsWithSignedEvaluation(),
      impactRepository.countChallengesWithProposals(),
      impactRepository.getProjectsByCategory(),
      impactRepository.getProjectsBySdg(),
    ]);

    res.status(200).json({
      totalPublicProjects,
      acceptedTeamRequests,
      pctWithProgressUpdates: pct(projectsWithProgressUpdates, totalPublicProjects),
      pctWithMultipleMembers: pct(projectsWithMultipleMembers, totalPublicProjects),
      challengesWithProposals,
      pctWithSignedEvaluation: pct(projectsWithSignedEvaluation, totalPublicProjects),
      projectsByCategory: projectsByCategory.map((row) => ({
        categoryId: row.id,
        name: row.name,
        colorHex: row.colorHex,
        count: row.count,
      })),
      projectsBySdg: projectsBySdg.map((row) => ({
        sdgId: row.id,
        name: row.name,
        colorHex: row.colorHex,
        count: row.count,
      })),
    });
  } catch (error) {
    next(error);
  }
}
