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
  Certification,
  CertificationsSection,
  Language,
  LanguagesSection,
  StructuredResume,
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
  seenRootSections: Set<string>;
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
    const expected = isClose ? `[(/${name})]` : `[(${name})]`;
    throw new ParseError(
      `Expected ${expected}`,
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

interface EntityFieldConfig {
  name: string;
  required: boolean;
}

function parseEntityFields(
  state: ParserState,
  entityName: string,
  fields: EntityFieldConfig[],
  endEntityName: string
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  const seenFields = new Set<string>();
  let fieldIndex = 0;

  while (state.index < state.tokens.length) {
    const token = peek(state);

    if (token.type === 'EOF') {
      throw new ParseError(`Unexpected end of input, expected [(/${endEntityName})]`, token.line, token.column);
    }

    if (token.type === 'ENDPOINT_CLOSE' && token.value === endEntityName) {
      break;
    }

    if (token.type === 'CONTENT') {
      throw new ParseError(
        `Free content not allowed inside ${entityName}. Use explicit endpoints.`,
        token.line,
        token.column
      );
    }

    if (token.type === 'ENDPOINT_OPEN') {
      const fieldName = token.value;

      const fieldConfig = fields.find(f => f.name === fieldName);
      if (!fieldConfig) {
        throw new ParseError(
          `Unknown endpoint ${fieldName} in ${entityName}`,
          token.line,
          token.column
        );
      }

      if (seenFields.has(fieldName)) {
        throw new ParseError(
          `Duplicate field ${fieldName} in ${entityName}`,
          token.line,
          token.column
        );
      }

      if (fieldIndex < fields.length && fields[fieldIndex].name !== fieldName) {
        const expectedField = fields[fieldIndex].name;
        throw new ParseError(
          `Field ${fieldName} out of order in ${entityName}. Expected ${expectedField} next.`,
          token.line,
          token.column
        );
      }

      consume(state);
      const content = parseContentUntil(state, fieldName);
      expectEndpoint(state, fieldName, true);

      if (fieldName === 'BULLETS') {
        const bulletLines = content.split('\n').filter(l => l.trim());
        result[fieldName] = bulletLines;
      } else {
        result[fieldName] = content;
      }

      seenFields.add(fieldName);
      fieldIndex++;

      while (fieldIndex < fields.length && !fields[fieldIndex].required) {
        fieldIndex++;
      }
    } else if (token.type === 'ENDPOINT_CLOSE') {
      throw new ParseError(
        `Unexpected closing endpoint ${token.value} inside ${entityName}`,
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, endEntityName, true);

  for (const field of fields) {
    if (field.required && !seenFields.has(field.name)) {
      throw new ParseError(
        `${entityName} must have ${field.name}`,
        peek(state).line,
        peek(state).column
      );
    }
  }

  return result;
}

function parseHeader(state: ParserState): Header {
  expectEndpoint(state, 'HEADER', false);

  const headerFields: EntityFieldConfig[] = [
    { name: 'NAME', required: true },
    { name: 'ROLE', required: false },
    { name: 'EMAIL', required: false },
    { name: 'PHONE', required: false },
    { name: 'LINKEDIN', required: false },
    { name: 'GITHUB', required: false },
    { name: 'WEBSITE', required: false },
    { name: 'LOCATION', required: false },
  ];

  const fields = parseEntityFields(state, 'HEADER', headerFields, 'HEADER');

  return {
    name: fields.NAME as string,
    role: fields.ROLE as string | undefined,
    email: fields.EMAIL as string | undefined,
    phone: fields.PHONE as string | undefined,
    linkedin: fields.LINKEDIN as string | undefined,
    github: fields.GITHUB as string | undefined,
    website: fields.WEBSITE as string | undefined,
    location: fields.LOCATION as string | undefined,
  };
}

function parseSummary(state: ParserState): Summary {
  expectEndpoint(state, 'SUMMARY', false);
  const text = parseContentUntil(state, 'SUMMARY');
  expectEndpoint(state, 'SUMMARY', true);
  return { text };
}

function parseProject(state: ParserState): Project {
  expectEndpoint(state, 'PROJECT', false);

  const projectFields: EntityFieldConfig[] = [
    { name: 'NAME', required: true },
    { name: 'STACK', required: false },
    { name: 'DESCRIPTION', required: false },
  ];

  const fields = parseEntityFields(state, 'PROJECT', projectFields, 'PROJECT');

  return {
    name: fields.NAME as string,
    stack: fields.STACK as string | undefined,
    description: fields.DESCRIPTION as string | undefined,
  };
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
      throw new ParseError(
        'Free content not allowed directly in PROJECTS. Use PROJECT endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'PROJECTS', true);
  return { projects };
}

function parseJob(state: ParserState): Job {
  expectEndpoint(state, 'JOB', false);

  const jobFields: EntityFieldConfig[] = [
    { name: 'TITLE', required: true },
    { name: 'COMPANY', required: false },
    { name: 'PERIOD', required: false },
    { name: 'DESCRIPTION', required: false },
    { name: 'BULLETS', required: false },
  ];

  const fields = parseEntityFields(state, 'JOB', jobFields, 'JOB');

  return {
    title: fields.TITLE as string,
    company: fields.COMPANY as string | undefined,
    period: fields.PERIOD as string | undefined,
    description: fields.DESCRIPTION as string | undefined,
    bullets: fields.BULLETS as string[] | undefined,
  };
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
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed directly in EXPERIENCE. Use JOB endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'EXPERIENCE', true);
  return { jobs };
}

function parseDegree(state: ParserState): Degree {
  expectEndpoint(state, 'DEGREE', false);

  const degreeFields: EntityFieldConfig[] = [
    { name: 'COURSE', required: false },
    { name: 'INSTITUTION', required: false },
    { name: 'PERIOD', required: false },
  ];

  const fields = parseEntityFields(state, 'DEGREE', degreeFields, 'DEGREE');

  if (!fields.COURSE && !fields.INSTITUTION) {
    throw new ParseError(
      'DEGREE must have COURSE or INSTITUTION',
      peek(state).line,
      peek(state).column
    );
  }

  return {
    course: fields.COURSE as string | undefined,
    institution: fields.INSTITUTION as string | undefined,
    period: fields.PERIOD as string | undefined,
  };
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
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed directly in EDUCATION. Use DEGREE endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'EDUCATION', true);
  return { degrees };
}

function parseSkillCategory(state: ParserState): SkillCategory {
  expectEndpoint(state, 'CATEGORY', false);

  const categoryFields: EntityFieldConfig[] = [
    { name: 'NAME', required: true },
    { name: 'TECHNOLOGIES', required: false },
  ];

  const fields = parseEntityFields(state, 'CATEGORY', categoryFields, 'CATEGORY');

  return {
    name: fields.NAME as string,
    technologies: fields.TECHNOLOGIES as string | undefined,
  };
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
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed directly in SKILLS. Use CATEGORY endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'SKILLS', true);
  return { categories };
}

function parseCertification(state: ParserState): Certification {
  expectEndpoint(state, 'CERTIFICATION', false);

  const certFields: EntityFieldConfig[] = [
    { name: 'NAME', required: true },
    { name: 'ISSUER', required: false },
    { name: 'YEAR', required: false },
  ];

  const fields = parseEntityFields(state, 'CERTIFICATION', certFields, 'CERTIFICATION');

  return {
    name: fields.NAME as string,
    issuer: fields.ISSUER as string | undefined,
    year: fields.YEAR as string | undefined,
  };
}

function parseCertifications(state: ParserState): CertificationsSection {
  expectEndpoint(state, 'CERTIFICATIONS', false);
  const certifications: Certification[] = [];

  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'CERTIFICATIONS') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'CERTIFICATION') {
      certifications.push(parseCertification(state));
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed directly in CERTIFICATIONS. Use CERTIFICATION endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'CERTIFICATIONS', true);
  return { certifications };
}

function parseLanguage(state: ParserState): Language {
  expectEndpoint(state, 'LANGUAGE', false);

  const langFields: EntityFieldConfig[] = [
    { name: 'NAME', required: true },
    { name: 'PROFICIENCY', required: false },
  ];

  const fields = parseEntityFields(state, 'LANGUAGE', langFields, 'LANGUAGE');

  return {
    name: fields.NAME as string,
    proficiency: fields.PROFICIENCY as string | undefined,
  };
}

function parseLanguages(state: ParserState): LanguagesSection {
  expectEndpoint(state, 'LANGUAGES', false);
  const languages: Language[] = [];

  while (state.index < state.tokens.length) {
    const token = peek(state);
    if (token.type === 'ENDPOINT_CLOSE' && token.value === 'LANGUAGES') {
      break;
    }
    if (token.type === 'ENDPOINT_OPEN' && token.value === 'LANGUAGE') {
      languages.push(parseLanguage(state));
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed directly in LANGUAGES. Use LANGUAGE endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  expectEndpoint(state, 'LANGUAGES', true);
  return { languages };
}

export function parseResume(rawText: string): StructuredResume {
  const tokens = tokenize(rawText);
  const state: ParserState = {
    tokens,
    index: 0,
    sections: [],
    seenRootSections: new Set(),
  };

  while (state.index < state.tokens.length) {
    const token = peek(state);

    if (token.type === 'EOF') {
      break;
    }

    if (token.type === 'ENDPOINT_OPEN') {
      const sectionName = token.value;

      if (state.seenRootSections.has(sectionName)) {
        throw new ParseError(
          `Duplicate root section ${sectionName}`,
          token.line,
          token.column
        );
      }

      switch (sectionName) {
        case 'HEADER': {
          const header = parseHeader(state);
          state.sections.push({ type: 'header', data: header });
          state.seenRootSections.add('HEADER');
          break;
        }
        case 'SUMMARY': {
          const summary = parseSummary(state);
          state.sections.push({ type: 'summary', data: summary });
          state.seenRootSections.add('SUMMARY');
          break;
        }
        case 'PROJECTS': {
          const projects = parseProjects(state);
          state.sections.push({ type: 'projects', data: projects });
          state.seenRootSections.add('PROJECTS');
          break;
        }
        case 'EXPERIENCE': {
          const experience = parseExperience(state);
          state.sections.push({ type: 'experience', data: experience });
          state.seenRootSections.add('EXPERIENCE');
          break;
        }
        case 'EDUCATION': {
          const education = parseEducation(state);
          state.sections.push({ type: 'education', data: education });
          state.seenRootSections.add('EDUCATION');
          break;
        }
        case 'SKILLS': {
          const skills = parseSkills(state);
          state.sections.push({ type: 'skills', data: skills });
          state.seenRootSections.add('SKILLS');
          break;
        }
        case 'CERTIFICATIONS': {
          const certifications = parseCertifications(state);
          state.sections.push({ type: 'certifications', data: certifications });
          state.seenRootSections.add('CERTIFICATIONS');
          break;
        }
        case 'LANGUAGES': {
          const languages = parseLanguages(state);
          state.sections.push({ type: 'languages', data: languages });
          state.seenRootSections.add('LANGUAGES');
          break;
        }
        default:
          throw new ParseError(`Unknown section endpoint ${sectionName}`, token.line, token.column);
      }
    } else if (token.type === 'CONTENT') {
      throw new ParseError(
        'Free content not allowed at root level. Use section endpoints.',
        token.line,
        token.column
      );
    } else {
      consume(state);
    }
  }

  return { sections: state.sections };
}