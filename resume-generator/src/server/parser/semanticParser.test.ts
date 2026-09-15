import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResume, ParseError } from './index';

const VALID_RESUME = `[(HEADER)]
João Silva
Desenvolvedor Full Stack
joao@email.com
[(/HEADER)]

[(SUMMARY)]
Desenvolvedor experiente com foco em aplicações web modernas.
[(/SUMMARY)]

[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Auronyx Backend — API e Arquitetura Escalável
[(/NAME)]
[(STACK)]
NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ, Docker
[(/STACK)]
[(DESCRIPTION)]
Desenvolvimento de API backend escalável com arquitetura modular.
[(/DESCRIPTION)]
[(/PROJECT)]
[(PROJECT)]
[(NAME)]
Simula-IA — Backend Serverless com IA Generativa
[(/NAME)]
[(STACK)]
Node.js, TypeScript, AWS Lambda, DynamoDB, Bedrock
[(/STACK)]
[(DESCRIPTION)]
Construção de backend serverless para geração de simulados.
[(/DESCRIPTION)]
[(/PROJECT)]
[(/PROJECTS)]

[(EXPERIENCE)]
[(JOB)]
[(TITLE)]
Tech Lead
[(/TITLE)]
[(COMPANY)]
Empresa X
[(/COMPANY)]
[(PERIOD)]
2022 - Atual
[(/PERIOD)]
[(DESCRIPTION)]
Liderança técnica de squad.
[(/DESCRIPTION)]
[(BULLETS)]
Liderou squad de 6 pessoas
Arquitetou sistema de pagamentos
[(/BULLETS)]
[(/JOB)]
[(/EXPERIENCE)]

[(EDUCATION)]
[(DEGREE)]
[(COURSE)]
Ciência da Computação
[(/COURSE)]
[(INSTITUTION)]
UNINTER
[(/INSTITUTION)]
[(PERIOD)]
2018 - 2022
[(/PERIOD)]
[(/DEGREE)]
[(/EDUCATION)]

[(SKILLS)]
[(CATEGORY)]
[(NAME)]
Linguagens
[(/NAME)]
[(TECHNOLOGIES)]
JavaScript, TypeScript, SQL
[(/TECHNOLOGIES)]
[(/CATEGORY)]
[(CATEGORY)]
[(NAME)]
Backend
[(/NAME)]
[(TECHNOLOGIES)]
Node.js, Express, NestJS
[(/TECHNOLOGIES)]
[(/CATEGORY)]
[(/SKILLS)]

[(CERTIFICATIONS)]
AWS Certified Solutions Architect
[(/CERTIFICATIONS)]

[(LANGUAGES)]
Português (Nativo)
Inglês (Avançado)
[(/LANGUAGES)]`;

test('parseResume parses complete valid resume', () => {
  const resume = parseResume(VALID_RESUME);
  
  assert.equal(resume.sections.length, 8);
  
  const header = resume.sections.find(s => s.type === 'header');
  assert.ok(header && header.type === 'header');
  if (header && header.type === 'header') {
    assert.equal(header.data.name, 'João Silva');
    assert.equal(header.data.role, 'Desenvolvedor Full Stack');
    assert.equal(header.data.contact.email, 'joao@email.com');
  }
  
  const summary = resume.sections.find(s => s.type === 'summary');
  assert.ok(summary && summary.type === 'summary');
  if (summary && summary.type === 'summary') {
    assert.ok(summary.data.text.includes('Desenvolvedor experiente'));
  }
  
  const projects = resume.sections.find(s => s.type === 'projects');
  assert.ok(projects && projects.type === 'projects');
  if (projects && projects.type === 'projects') {
    assert.equal(projects.data.projects.length, 2);
    assert.equal(projects.data.projects[0].name, 'Auronyx Backend — API e Arquitetura Escalável');
    assert.equal(projects.data.projects[0].stack, 'NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ, Docker');
    assert.equal(projects.data.projects[0].description, 'Desenvolvimento de API backend escalável com arquitetura modular.');
    assert.equal(projects.data.projects[1].name, 'Simula-IA — Backend Serverless com IA Generativa');
  }
  
  const experience = resume.sections.find(s => s.type === 'experience');
  assert.ok(experience && experience.type === 'experience');
  if (experience && experience.type === 'experience') {
    assert.equal(experience.data.jobs.length, 1);
    assert.equal(experience.data.jobs[0].title, 'Tech Lead');
    assert.equal(experience.data.jobs[0].company, 'Empresa X');
    assert.equal(experience.data.jobs[0].period, '2022 - Atual');
    assert.equal(experience.data.jobs[0].bullets.length, 2);
  }
  
  const education = resume.sections.find(s => s.type === 'education');
  assert.ok(education && education.type === 'education');
  if (education && education.type === 'education') {
    assert.equal(education.data.degrees.length, 1);
    assert.equal(education.data.degrees[0].course, 'Ciência da Computação');
    assert.equal(education.data.degrees[0].institution, 'UNINTER');
    assert.equal(education.data.degrees[0].period, '2018 - 2022');
  }
  
  const skills = resume.sections.find(s => s.type === 'skills');
  assert.ok(skills && skills.type === 'skills');
  if (skills && skills.type === 'skills') {
    assert.equal(skills.data.categories.length, 2);
    assert.equal(skills.data.categories[0].name, 'Linguagens');
    assert.equal(skills.data.categories[0].technologies, 'JavaScript, TypeScript, SQL');
    assert.equal(skills.data.categories[1].name, 'Backend');
  }
  
  const certifications = resume.sections.find(s => s.type === 'certifications');
  assert.ok(certifications && certifications.type === 'certifications');
  if (certifications && certifications.type === 'certifications') {
    assert.equal(certifications.data.items.length, 1);
    assert.equal(certifications.data.items[0], 'AWS Certified Solutions Architect');
  }
  
  const languages = resume.sections.find(s => s.type === 'languages');
  assert.ok(languages && languages.type === 'languages');
  if (languages && languages.type === 'languages') {
    assert.equal(languages.data.items.length, 2);
  }
});

test('parseResume preserves project order', () => {
  const resume = parseResume(VALID_RESUME);
  const projects = resume.sections.find(s => s.type === 'projects');
  assert.ok(projects && projects.type === 'projects');
  if (projects && projects.type === 'projects') {
    assert.equal(projects.data.projects[0].name, 'Auronyx Backend — API e Arquitetura Escalável');
    assert.equal(projects.data.projects[1].name, 'Simula-IA — Backend Serverless com IA Generativa');
  }
});

test('parseResume throws ParseError on missing closing endpoint', () => {
  const invalid = `[(HEADER)]
João Silva
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Test Project
[(/NAME)]
[(/PROJECTS)]`;
  
  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on unknown endpoint', () => {
  const invalid = `[(UNKNOWN)]
content
[(/UNKNOWN)]`;
  
  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on PROJECT without NAME', () => {
  const invalid = `[(HEADER)]
João
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(STACK)]
React
[(/STACK)]
[(/PROJECT)]
[(/PROJECTS)]`;
  
  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume handles minimal resume with only header', () => {
  const minimal = `[(HEADER)]
Ana Souza
[(/HEADER)]`;
  
  const resume = parseResume(minimal);
  assert.equal(resume.sections.length, 1);
  const header = resume.sections[0];
  assert.ok(header && header.type === 'header');
  if (header && header.type === 'header') {
    assert.equal(header.data.name, 'Ana Souza');
  }
});

test('parseResume handles project without optional fields', () => {
  const input = `[(HEADER)]
João
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Simple Project
[(/NAME)]
[(/PROJECT)]
[(/PROJECTS)]`;
  
  const resume = parseResume(input);
  const projects = resume.sections.find(s => s.type === 'projects');
  assert.ok(projects && projects.type === 'projects');
  if (projects && projects.type === 'projects') {
    assert.equal(projects.data.projects.length, 1);
    assert.equal(projects.data.projects[0].name, 'Simple Project');
    assert.equal(projects.data.projects[0].stack, undefined);
    assert.equal(projects.data.projects[0].description, undefined);
  }
});

test('parseResume handles content without explicit endpoints in PROJECTS', () => {
  const input = `[(HEADER)]
João
[(/HEADER)]
[(PROJECTS)]
Project A
Project B
[(/PROJECTS)]`;
  
  const resume = parseResume(input);
  const projects = resume.sections.find(s => s.type === 'projects');
  assert.ok(projects && projects.type === 'projects');
  if (projects && projects.type === 'projects') {
    assert.equal(projects.data.projects.length, 2);
    assert.equal(projects.data.projects[0].name, 'Project A');
    assert.equal(projects.data.projects[1].name, 'Project B');
  }
});