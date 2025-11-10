declare module 'snoowrap' {
  export interface SnoowrapOptions {
    userAgent: string;
    clientId: string;
    clientSecret: string;
    username?: string;
    password?: string;
    refreshToken?: string;
  }

  export interface RedditUser {
    id?: string;
    name: string;
  }

  export interface Subreddit {
    display_name: string;
    id?: string;
  }

  export interface Submission {
    id: string;
    title: string;
    selftext: string;
    author: RedditUser;
    subreddit: Subreddit;
    created_utc: number;
    permalink: string;
    score: number;
    ups: number;
    num_comments: number;
    upvote_ratio: number;
    link_flair_text: string | null;
    stickied: boolean;
    over_18: boolean;
    domain: string;
    gilded: number;
    locked: boolean;
    archived: boolean;
    comments: CommentListing;
    fetch(): Promise<Submission>;
  }

  export interface Comment {
    id: string;
    body: string;
    author: RedditUser;
    created_utc: number;
    permalink: string;
    score: number;
    ups: number;
    parent_id: string;
    link_id: string;
    is_submitter: boolean;
    gilded: number;
    locked: boolean;
    archived: boolean;
    controversiality: number;
    replies: CommentListing | string;
  }

  export interface CommentListing {
    fetchAll(options?: { limit?: number }): Promise<Comment[]>;
  }

  export interface SubredditObject {
    display_name: string;
    fetch(): Promise<SubredditObject>;
    getNew(options?: { limit?: number }): Promise<Submission[]>;
    getHot(options?: { limit?: number }): Promise<Submission[]>;
    getTop(options?: { limit?: number; time?: string }): Promise<Submission[]>;
  }

  export default class Snoowrap {
    constructor(options: SnoowrapOptions);
    config(options: { requestDelay?: number; warnings?: boolean; continueAfterRatelimitError?: boolean }): void;
    search(options: { query: string; limit?: number; sort?: string; time?: string }): Promise<Submission[]>;
    getSubmission(id: string): Submission;
    getSubreddit(name: string): SubredditObject;
  }
}
