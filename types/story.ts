import { User } from './index';

export type StoryType = 'image' | 'video' | 'text' | 'link';

export interface StoryTextStyle {
  background?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: string;
}

export interface StoryViewer {
  user: User;
  viewedAt: string;
}

export interface Story {
  _id: string;
  author: User;
  type: StoryType;
  mediaUrl?: string;
  caption?: string;
  textContent?: string;
  textStyle?: StoryTextStyle;
  linkUrl?: string;
  linkTitle?: string;
  viewers: StoryViewer[];
  duration: number;
  createdAt: string;
  expiresAt: string;
}

export interface UserStoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface CreateStoryData {
  type: StoryType;
  mediaUrl?: string;
  caption?: string;
  textContent?: string;
  textStyle?: StoryTextStyle;
  linkUrl?: string;
  linkTitle?: string;
  duration?: number;
}

export interface StoryDraft {
  type: StoryType;
  mediaUrl?: string | null;
  caption?: string;
  textContent?: string;
  textStyle?: StoryTextStyle;
  linkUrl?: string;
  linkTitle?: string;
}
