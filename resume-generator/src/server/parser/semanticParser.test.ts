import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseResume, ParseError } from './index';

const VALID_RESUME = `[(HEADER)]
[(NAME)]
João Silva
[(/NAME)]
[(ROLE)]
Desenvolvedor Full Stack
[(/ROLE)]
[(EMAIL)]
joao@email.com
[(/EMAIL)]
[(PHONE)]
+55 11 99999-9999
[(/PHONE)]
[(LINKEDIN)]
linkedin.com/in/joao
[(/LINKEDIN)]
[(GITHUB)]
github.com/joao
[(/GITHUB)]
[(WEBSITE)]
https://joao.dev
[(/WEBSITE)]
[(LOCATION)]
São Paulo - SP
[(/LOCATION)]
[(/HEADER)]

[(SUMMARY)]
Desenvolvedor experiente com foco em aplicações web modernas.
Experiência com React, Node.js e TypeScript.
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
[(JOB)]
[(TITLE)]
Senior Developer
[(/TITLE)]
[(COMPANY)]
Empresa Y
[(/COMPANY)]
[(PERIOD)]
2020 - 2022
[(/PERIOD)]
[(DESCRIPTION)]
Desenvolvimento de microserviços.
[(/DESCRIPTION)]
[(BULLETS)]
Implementou API Gateway
Otimizou queries de banco
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
[(DEGREE)]
[(COURSE)]
Mestrado em IA
[(/COURSE)]
[(INSTITUTION)]
USP
[(/INSTITUTION)]
[(PERIOD)]
2022 - 2024
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
[(CERTIFICATION)]
[(NAME)]
AWS Certified Solutions Architect
[(/NAME)]
[(ISSUER)]
Amazon Web Services
[(/ISSUER)]
[(YEAR)]
2023
[(/YEAR)]
[(/CERTIFICATION)]
[(CERTIFICATION)]
[(NAME)]
Google Cloud Professional
[(/NAME)]
[(ISSUER)]
Google
[(/ISSUER)]
[(YEAR)]
2022
[(/YEAR)]
[(/CERTIFICATION)]
[(/CERTIFICATIONS)]

[(LANGUAGES)]
[(LANGUAGE)]
[(NAME)]
Português
[(/NAME)]
[(PROFICIENCY)]
Nativo
[(/PROFICIENCY)]
[(/LANGUAGE)]
[(LANGUAGE)]
[(NAME)]
Inglês
[(/NAME)]
[(PROFICIENCY)]
Avançado
[(/PROFICIENCY)]
[(/LANGUAGE)]
[(/LANGUAGES)]`;

test('parseResume parses complete valid resume', () => {
  const resume = parseResume(VALID_RESUME);

  assert.equal(resume.sections.length, 8);

  const header = resume.sections.find(s => s.type === 'header');
  assert.ok(header && header.type === 'header');
  if (header && header.type === 'header') {
    assert.equal(header.data.name, 'João Silva');
    assert.equal(header.data.role, 'Desenvolvedor Full Stack');
    assert.equal(header.data.email, 'joao@email.com');
    assert.equal(header.data.phone, '+55 11 99999-9999');
    assert.equal(header.data.linkedin, 'linkedin.com/in/joao');
    assert.equal(header.data.github, 'github.com/joao');
    assert.equal(header.data.website, 'https://joao.dev');
    assert.equal(header.data.location, 'São Paulo - SP');
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
    assert.equal(experience.data.jobs.length, 2);
    assert.equal(experience.data.jobs[0].title, 'Tech Lead');
    assert.equal(experience.data.jobs[0].company, 'Empresa X');
    assert.equal(experience.data.jobs[0].period, '2022 - Atual');
    assert.equal(experience.data.jobs[0].bullets?.length, 2);
    assert.equal(experience.data.jobs[1].title, 'Senior Developer');
    assert.equal(experience.data.jobs[1].company, 'Empresa Y');
  }

  const education = resume.sections.find(s => s.type === 'education');
  assert.ok(education && education.type === 'education');
  if (education && education.type === 'education') {
    assert.equal(education.data.degrees.length, 2);
    assert.equal(education.data.degrees[0].course, 'Ciência da Computação');
    assert.equal(education.data.degrees[0].institution, 'UNINTER');
    assert.equal(education.data.degrees[0].period, '2018 - 2022');
    assert.equal(education.data.degrees[1].course, 'Mestrado em IA');
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
    assert.equal(certifications.data.certifications.length, 2);
    assert.equal(certifications.data.certifications[0].name, 'AWS Certified Solutions Architect');
    assert.equal(certifications.data.certifications[0].issuer, 'Amazon Web Services');
    assert.equal(certifications.data.certifications[0].year, '2023');
  }

  const languages = resume.sections.find(s => s.type === 'languages');
  assert.ok(languages && languages.type === 'languages');
  if (languages && languages.type === 'languages') {
    assert.equal(languages.data.languages.length, 2);
    assert.equal(languages.data.languages[0].name, 'Português');
    assert.equal(languages.data.languages[0].proficiency, 'Nativo');
    assert.equal(languages.data.languages[1].name, 'Inglês');
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
[(NAME)]
João Silva
[(/NAME)]
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
[(NAME)]
João
[(/NAME)]
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

test('parseResume throws ParseError on duplicate field in PROJECT', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Project A
[(/NAME)]
[(NAME)]
Project B
[(/NAME)]
[(/PROJECT)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on field out of order in PROJECT', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(DESCRIPTION)]
Description first
[(/DESCRIPTION)]
[(NAME)]
Project A
[(/NAME)]
[(/PROJECT)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on free content in PROJECT', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
Free content here
[(/PROJECT)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on unknown endpoint in PROJECT', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Project
[(/NAME)]
[(UNKNOWN)]
test
[(/UNKNOWN)]
[(/PROJECT)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on duplicate root section', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(HEADER)]
[(NAME)]
Maria
[(/NAME)]
[(/HEADER)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on JOB without TITLE', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(EXPERIENCE)]
[(JOB)]
[(COMPANY)]
Empresa
[(/COMPANY)]
[(/JOB)]
[(/EXPERIENCE)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on DEGREE without COURSE or INSTITUTION', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(EDUCATION)]
[(DEGREE)]
[(PERIOD)]
2020
[(/PERIOD)]
[(/DEGREE)]
[(/EDUCATION)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on free content in EXPERIENCE', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(EXPERIENCE)]
Free content
[(/EXPERIENCE)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on free content in CERTIFICATIONS', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(CERTIFICATIONS)]
Free cert
[(/CERTIFICATIONS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on free content in LANGUAGES', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(LANGUAGES)]
Português
[(/LANGUAGES)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on CERTIFICATION outside CERTIFICATIONS', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(CERTIFICATION)]
[(NAME)]
Cert
[(/NAME)]
[(/CERTIFICATION)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on LANGUAGE outside LANGUAGES', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(LANGUAGE)]
[(NAME)]
Português
[(/NAME)]
[(/LANGUAGE)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on HEADER field outside HEADER', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Project
[(/NAME)]
[(ROLE)]
Not allowed here
[(/ROLE)]
[(/PROJECT)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume throws ParseError on incorrect closing order (LIFO)', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(PROJECTS)]
[(PROJECT)]
[(NAME)]
Project
[(/NAME)]
[(/PROJECTS)]
[(/PROJECT)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume handles minimal resume with only header', () => {
  const minimal = `[(HEADER)]
[(NAME)]
Ana Souza
[(/NAME)]
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
[(NAME)]
João
[(/NAME)]
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

test('parseResume handles CERTIFICATION without optional fields', () => {
  const input = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(CERTIFICATIONS)]
[(CERTIFICATION)]
[(NAME)]
Simple Cert
[(/NAME)]
[(/CERTIFICATION)]
[(/CERTIFICATIONS)]`;

  const resume = parseResume(input);
  const certs = resume.sections.find(s => s.type === 'certifications');
  assert.ok(certs && certs.type === 'certifications');
  if (certs && certs.type === 'certifications') {
    assert.equal(certs.data.certifications.length, 1);
    assert.equal(certs.data.certifications[0].name, 'Simple Cert');
    assert.equal(certs.data.certifications[0].issuer, undefined);
    assert.equal(certs.data.certifications[0].year, undefined);
  }
});

test('parseResume handles LANGUAGE without optional fields', () => {
  const input = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(LANGUAGES)]
[(LANGUAGE)]
[(NAME)]
Português
[(/NAME)]
[(/LANGUAGE)]
[(/LANGUAGES)]`;

  const resume = parseResume(input);
  const langs = resume.sections.find(s => s.type === 'languages');
  assert.ok(langs && langs.type === 'languages');
  if (langs && langs.type === 'languages') {
    assert.equal(langs.data.languages.length, 1);
    assert.equal(langs.data.languages[0].name, 'Português');
    assert.equal(langs.data.languages[0].proficiency, undefined);
  }
});

test('parseResume handles free content at root level', () => {
  const invalid = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
Free content at root
[(PROJECTS)]
[(/PROJECTS)]`;

  assert.throws(() => parseResume(invalid), ParseError);
});

test('parseResume handles BULLETS multiline correctly', () => {
  const input = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(EXPERIENCE)]
[(JOB)]
[(TITLE)]
Dev
[(/TITLE)]
[(BULLETS)]
First bullet
Second bullet
Third bullet
[(/BULLETS)]
[(/JOB)]
[(/EXPERIENCE)]`;

  const resume = parseResume(input);
  const exp = resume.sections.find(s => s.type === 'experience');
  assert.ok(exp && exp.type === 'experience');
  if (exp && exp.type === 'experience') {
    assert.equal(exp.data.jobs[0].bullets?.length, 3);
    assert.equal(exp.data.jobs[0].bullets?.[0], 'First bullet');
    assert.equal(exp.data.jobs[0].bullets?.[1], 'Second bullet');
    assert.equal(exp.data.jobs[0].bullets?.[2], 'Third bullet');
  }
});

test('parseResume handles SUMMARY multiline', () => {
  const input = `[(HEADER)]
[(NAME)]
João
[(/NAME)]
[(/HEADER)]
[(SUMMARY)]
Line one
Line two
Line three
[(/SUMMARY)]`;

  const resume = parseResume(input);
  const summary = resume.sections.find(s => s.type === 'summary');
  assert.ok(summary && summary.type === 'summary');
  if (summary && summary.type === 'summary') {
    assert.ok(summary.data.text.includes('Line one'));
    assert.ok(summary.data.text.includes('Line two'));
    assert.ok(summary.data.text.includes('Line three'));
  }
});