import { IdeaRepository } from './idea.repository';
import { Idea } from './idea.entity';

// TODO validation
export class IdeaCommandHandler {
  constructor(private readonly repository: IdeaRepository) {}

  async create(): Promise<Idea> {
    // TODO generate id
    const ideaId: string = 'random-id-' + Date.now().toString();
    const idea = Idea.create(ideaId);
    await this.repository.save(idea);
    return idea.confirmEvents();
  }

  async saveDraft(ideaId: string, title?: string, description?: string): Promise<Idea> {
    const idea = await this.repository.findById(ideaId);
    idea.saveDraft(title, description);
    await this.repository.save(idea);
    return idea.confirmEvents();
  }

  async publish(ideaId: string) {
    const idea = await this.repository.findById(ideaId);
    idea.publish();
    await this.repository.save(idea);
    return idea.confirmEvents();
  }

  async update(ideaId: string, title?: string, description?: string) {
    const idea = await this.repository.findById(ideaId);
    idea.update(title, description);
    await this.repository.save(idea);
    return idea.confirmEvents();
  }

  async unpublish(ideaId: string) {
    const idea = await this.repository.findById(ideaId);
    idea.unpublish();
    await this.repository.save(idea);
    return idea.confirmEvents();
  }

  async delete(ideaId: string) {
    const idea = await this.repository.findById(ideaId);
    idea.delete();
    await this.repository.save(idea);
    return idea.confirmEvents();
  }
}
