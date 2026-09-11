import { ProjectsService } from './projects_service';

export class ProjectsUtil {
  /**
   * Checks whether all provided project_ids exist in the database.
   * @param project_ids - Array of project UUIDs to validate.
   * @returns Promise<boolean> True if every ID exists in the database.
   */
  public static async checkValidProjectIds(
    project_ids: string[]
  ): Promise<boolean> {
    if (!project_ids || project_ids.length === 0) {
      return false;
    }

    try {
      const projectService = await ProjectsService.createInstance();
      const projectsResult = await projectService.findByIds(project_ids);

      if (!projectsResult || !projectsResult.data) {
        return false;
      }

      // De-duplicate target IDs to handle duplicate inputs cleanly
      const uniqueInputIds = Array.from(new Set(project_ids));

      return projectsResult.data.length === uniqueInputIds.length;
    } catch (error: any) {
      console.error(
        `Error in ProjectsUtil.checkValidProjectIds: ${error?.message || error}`
      );
      return false;
    }
  }
}
