import {
  Header,
  Summary,
  Project,
  ProjectsSection,
  Job,
  ExperienceSection,
  Degree,
  EducationSection,
  SkillCategory,
  SkillsSection,
  StructuredResume,
  ContactInfo,
  ResumeSection,
} from './semanticTypes';
import { Token, TokenType, tokenize } from './tokenizer';

export class ParseError extends Error {
  constructor(message: string, public readonly line: number, public readonly column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'ParseError';
  }
}

interface ParserState {
  tokens: Token[];
  index: number;
  sections: ResumeSection[];
  currentSection: ResumeSection | null;
}

function peek(state: ParserState): Token {
  return state.tokens[state.index];
}

function consume(state: ParserState, expectedType?: TokenType): Token {
  const token = state.tokens[state.index];
  if (expectedType && token.type !== expectedType) {
    throw new ParseError(`Expected ${expectedType}, got ${token.type}`, token.line, token.column);
  }
  state.index++;
  return token;
}

function expectEndpoint(state: ParserState, name: string, isClose: boolean): void {
  const token = peek(state);
  if (token.type !== (isClose ? 'ENDPOINT_CLOSE' : 'ENDPOINT_OPEN') || token.value !== name) {
    throw new ParseError(
      `Expected ${isClose ? '[(/' : '[(/'}${name}${'}]'}`,
      token.line,
      token.column
    );
  }
  consume(state);
}

function parseContentUntil(state: ParserState, endEndpoint: string): string {
  const lines: string[] = [];
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === endEndpoint) {
      break;
    }
    if (token.type === 'CONTENT') {
      lines.push(token.value);
    } else if (token.type === 'ENDPOINT_OPEN' || token.type === 'ENDPOINT_CLOSE') {
      throw new ParseError(
        `Unexpected endpoint ${token.value} inside ${endEndpoint}`,
        token.line,
        token.column
      );
    }
    consume(state);
  }
  return lines.join('\n').trim();
}

function parseHeader(state: ParserState): Header {
  expectEndpoint(state, 'HEADER', false);
  const lines: string[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'HEADER') {
      break;
    }
    if (token.type === 'CONTENT') {
      lines.push(token.value);
    } else if (token.type === 'ENDPOINT_OPEN' || token.type === 'ENDPOINT_CLOSE') {
      throw new ParseError(
        `Nested endpoints not allowed in HEADER`,
        token.line,
        token.column
      );
    }
    consume(state);
  }
  expectEndpoint(state, 'HEADER', true);

  const contact: ContactInfo = {};
  let name = '';
  let role: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!name) {
      name = trimmed;
    } else if (!role && !trimmed.includes('@') && !trimmed.includes('linkedin') && !trimmed.includes('github')) {
      role = trimmed;
    } else {
      if (trimmed.includes('@') && !contact.email) {
        contact.email = trimmed.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? trimmed;
      } else if (trimmed.includes('linkedin') && !contact.linkedin) {
        contact.linkedin = trimmed;
      } else if (trimmed.includes('github') && !contact.github) {
        contact.github = trimmed;
      } else if (/(\+?\d[\d\s().-]{7,}\d)/.test(trimmed) && !contact.phone) {
        contact.phone = trimmed.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? trimmed;
      } else if (!contact.location) {
        contact.location = trimmed;
      }
    }
  }

  return { name, role, contact };
}

function parseSummary(state: ParserState): Summary {
  expectEndpoint(state, 'SUMMARY', false);
  const text = parseContentUntil(state, 'SUMMARY');
  expectEndpoint(state, 'SUMMARY', true);
  return { text };
}

function parseProject(state: ParserState): Project {
  expectEndpoint(state, 'PROJECT', false);
  
  let name = '';
  let stack: string | undefined;
  let description: string | undefined;

  while (state.index < state.tokens.length) {
    const token = peek(state);
    
    if (token.type === 'EOF') {
      throw new ParseError('Unexpected end of input, expected [(/PROJECT)]', token.line, token.column);
    }
    
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'PROJECT') {
      break;
    }
    
    if (token.type === 'ENDPOINT_OPEN') {
      if (token.value === 'NAME') {
        consume(state);
        name = parseContentUntil(state, 'NAME');
        expectEndpoint(state, 'NAME', true);
      } else if (token.value === 'STACK') {
        consume(state);
        stack = parseContentUntil(state, 'STACK');
        expectEndpoint(state, 'STACK', true);
      } else if (token.value === 'DESCRIPTION') {
        consume(state);
        description = parseContentUntil(state, 'DESCRIPTION');
        expectEndpoint(state, 'DESCRIPTION', true);
      } else {
        throw new ParseError(`Unknown endpoint ${token.value} in PROJECT`, token.line, token.column);
      }
    } else if (token.type === 'CONTENT') {
      if (!name) {
        name = token.value.trim();
      } else if (!description) {
        description = token.value.trim();
      }
      consume(state);
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'PROJECT', true);
  
  if (!name) {
    throw new ParseError('PROJECT must have a NAME', peek(state).line, peek(state).column);
  }
  
  return { name, stack, description };
}

function parseProjects(state: ParserState): ProjectsSection {
  expectEndpoint(state, 'PROJECTS', false);
  const projects: Project[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'PROJECTS') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'PROJECT') {
      projects.push(parseProject(state));
    } else if (token.type === 'CONTENT') {
      const lines = parseContentUntil(state, 'PROJECTS').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          projects.push({ name: line.trim() });
        }
      }
      break;
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'PROJECTS', true);
  return { projects };
}

function parseJob(state: ParserState): Job {
  expectEndpoint(state, 'JOB', false);
  
  let title = '';
  let company: string | undefined;
  let period: string | undefined;
  let description: string | undefined;
  const bullets: string[] = [];

  while (state.index < state.tokens.length) {
    const token = peek(state);
    
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'JOB') {
      break;
    }
    
    if (token.type === 'ENDPOINT_OPEN') {
      if (token.value === 'TITLE') {
        consume(state);
        title = parseContentUntil(state, 'TITLE');
        expectEndpoint(state, 'TITLE', true);
      } else if (token.value === 'COMPANY') {
        consume(state);
        company = parseContentUntil(state, 'COMPANY');
        expectEndpoint(state, 'COMPANY', true);
      } else if (token.value === 'PERIOD') {
        consume(state);
        period = parseContentUntil(state, 'PERIOD');
        expectEndpoint(state, 'PERIOD', true);
      } else if (token.value === 'DESCRIPTION') {
        consume(state);
        description = parseContentUntil(state, 'DESCRIPTION');
        expectEndpoint(state, 'DESCRIPTION', true);
      } else if (token.value === 'BULLETS') {
        consume(state);
        const bulletsText = parseContentUntil(state, 'BULLETS');
        const bulletLines = bulletsText.split('\n').filter(l => l.trim());
        for (const bl of bulletLines) {
          bullets.push(bl.trim().replace(/^[-•*–]\s*/, ''));
        }
        expectEndpoint(state, 'BULLETS', true);
      } else {
        throw new ParseError(`Unknown endpoint ${token.value} in JOB`, token.line, token.column);
      }
    } else if (token.type === 'CONTENT') {
      if (!title) {
        title = token.value.trim();
      } else if (!description) {
        description = token.value.trim();
      }
      consume(state);
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'JOB', true);
  
  if (!title) {
    throw new ParseError('JOB must have a TITLE', peek(state).line, peek(state).column);
  }
  
  return { title, company, period, description, bullets };
}

function parseExperience(state: ParserState): ExperienceSection {
  expectEndpoint(state, 'EXPERIENCE', false);
  const jobs: Job[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'EXPERIENCE') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'JOB') {
      jobs.push(parseJob(state));
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'EXPERIENCE', true);
  return { jobs };
}

function parseDegree(state: ParserState): Degree {
  expectEndpoint(state, 'DEGREE', false);
  
  let institution = '';
  let course = '';
  let period: string | undefined;

  while (state.index < state.tokens.length) {
    const token = peek(state);
    
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'DEGREE') {
      break;
    }
    
    if (token.type === 'ENDPOINT_OPEN') {
      if (token.value === 'INSTITUTION') {
        consume(state);
        institution = parseContentUntil(state, 'INSTITUTION');
        expectEndpoint(state, 'INSTITUTION', true);
      } else if (token.value === 'COURSE') {
        consume(state);
        course = parseContentUntil(state, 'COURSE');
        expectEndpoint(state, 'COURSE', true);
      } else if (token.value === 'PERIOD') {
        consume(state);
        period = parseContentUntil(state, 'PERIOD');
        expectEndpoint(state, 'PERIOD', true);
      } else {
        throw new ParseError(`Unknown endpoint ${token.value} in DEGREE`, token.line, token.column);
      }
    } else if (token.type === 'CONTENT') {
      if (!course) {
        course = token.value.trim();
      } else if (!institution) {
        institution = token.value.trim();
      }
      consume(state);
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'DEGREE', true);
  
  if (!course && !institution) {
    throw new ParseError('DEGREE must have COURSE or INSTITUTION', peek(state).line, peek(state).column);
  }
  
  return { institution, course, period };
}

function parseEducation(state: ParserState): EducationSection {
  expectEndpoint(state, 'EDUCATION', false);
  const degrees: Degree[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'EDUCATION') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'DEGREE') {
      degrees.push(parseDegree(state));
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'EDUCATION', true);
  return { degrees };
}

function parseSkillCategory(state: ParserState): SkillCategory {
  expectEndpoint(state, 'CATEGORY', false);
  
  let name = '';
  let technologies = '';

  while (state.index < state.tokens.length) {
    const token = peek(state);
    
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'CATEGORY') {
      break;
    }
    
    if (token.type === 'ENDPOINT_OPEN') {
      if (token.value === 'NAME') {
        consume(state);
        name = parseContentUntil(state, 'NAME');
        expectEndpoint(state, 'NAME', true);
      } else if (token.value === 'TECHNOLOGIES') {
        consume(state);
        technologies = parseContentUntil(state, 'TECHNOLOGIES');
        expectEndpoint(state, 'TECHNOLOGIES', true);
      } else {
        throw new ParseError(`Unknown endpoint ${token.value} in CATEGORY`, token.line, token.column);
      }
    } else if (token.type === 'CONTENT') {
      if (!name) {
        name = token.value.trim();
      } else if (!technologies) {
        technologies = token.value.trim();
      }
      consume(state);
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'CATEGORY', true);
  
  if (!name) {
    throw new ParseError('CATEGORY must have a NAME', peek(state).line, peek(state).column);
  }
  
  return { name, technologies };
}

function parseSkills(state: ParserState): SkillsSection {
  expectEndpoint(state, 'SKILLS', false);
  const categories: SkillCategory[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'SKILLS') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'CATEGORY') {
      categories.push(parseSkillCategory(state));
    } else {
      consume(state);
    }
  }
  
  expectEndpoint(state, 'SKILLS', true);
  return { categories };
}

function parseListSection(state: ParserState, sectionName: string): string[] {
  expectEndpoint(state, sectionName, false);
  const items: string[] = [];
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === sectionName) {
      break;
    }
    if (token.type === 'CONTENT') {
      items.push(token.value.trim());
    }
    consume(state);
  }
  
  expectEndpoint(state, sectionName, true);
  return items;
}

export function parseResume(rawText: string): StructuredResume {
  const tokens = tokenize(rawText);
  const state: ParserState = { tokens, index: 0, sections: [], currentSection: null };
  
  while (state.index < state.tokens.length) {
    const token = peek(state);
    
    if (token.type === 'EOF') {
      break;
    }
    
    if (token.type === 'ENDPOINT_OPEN') {
      switch (token.value) {
        case 'HEADER': {
          const header = parseHeader(state);
          state.sections.push({ type: 'header', data: header });
          break;
        }
        case 'SUMMARY': {
          const summary = parseSummary(state);
          state.sections.push({ type: 'summary', data: summary });
          break;
        }
        case 'PROJECTS': {
          const projects = parseProjects(state);
          state.sections.push({ type: 'projects', data: projects });
          break;
        }
        case 'EXPERIENCE': {
          const experience = parseExperience(state);
          state.sections.push({ type: 'experience', data: experience });
          break;
        }
        case 'EDUCATION': {
          const education = parseEducation(state);
          state.sections.push({ type: 'education', data: education });
          break;
        }
        case 'SKILLS': {
          const skills = parseSkills(state);
          state.sections.push({ type: 'skills', data: skills });
          break;
        }
        case 'CERTIFICATIONS': {
          const items = parseListSection(state, 'CERTIFICATIONS');
          state.sections.push({ type: 'certifications', data: { items } });
          break;
        }
        case 'LANGUAGES': {
          const items = parseListSection(state, 'LANGUAGES');
          state.sections.push({ type: 'languages', data: { items } });
          break;
        }
        default:
          throw new ParseError(`Unknown section endpoint ${token.value}`, token.line, token.column);
      }
    } else {
      consume(state);
    }
  }
  
  return { sections: state.sections };
}