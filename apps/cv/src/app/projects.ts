import {
  AUGUST_2005,
  DEZEMBER_2016,
  DEZEMBER_2019,
  DEZEMBER_2021,
  FEBRUAR_2017,
  FEBRUAR_2020,
  FEBRUARY_2013,
  JANUAR_2013,
  JANUAR_2022,
  JUNE_2008,
  JUNI_2022,
  NOW,
  OKTOBER_2010,
  OKTOBER_2022,
  SEPTEMBER_2022,
} from './dates';

export const APU = {
  id: 1,
  from: OKTOBER_2022,
  to: NOW,
  description: '',
  company: 'akros AG',
  role: 'Frontend-Entwickler',

  paragraph: [
    `
        As a frontend software developer, I focus on building scalable and maintainable Angular applications.
        The main task has been rewriting an existing Angular application with the latest version and best practices
        to ensure long-term stability and ease of maintenance. Since the application is used by users in an dangerous
        environment, it was essential to ensure seamless functionality even without an internet connection. To achieve
        this, I used IndexedDB for local storage and set the application up as a progressive web application. To enhance
        modularity and code sharing, the app was introduced in an Nx monorepo. I also introduced NgRx for
        predictable state management and restructured components following the single-responsibility principle,
        using presentational and smart components. Further libraries like storybook for presentational components and
        oblador/loki for visual regression testing came along the line.
    `,
    `
        To provide seamless authentication, I implemented single sign-on (SSO) with the help of a Spring Boot
        application. The authentication system integrates Azure as the active directory and SAP as the business backend,
        utilizing the SAML OBO-Auth flow to securely manage authentication and authorization across systems.
    `,
    `
        Beyond development, I optimized the deployment pipeline to ensure efficient and reliable software delivery.
        I led the migration of the application's deployment from SAP HANA Cloud to OpenShift. I set up Tekton for
        continuous integration and ArgoCD for continuous deployment. Sonarqube was integrated in the pipeline
        to ensure the high software quality.
    `,
    `
        To support monitoring, proactive issue detection, and debugging, I integrated Instana into the application.
        This enables real-time insights into application performance and system health, making it easier to identify
        and resolve issues quickly, ensuring a smooth and reliable user experience.
    `,
  ],
};

export const PERFOOD = {
  id: 2,
  from: JUNI_2022,
  to: SEPTEMBER_2022,
  description: '',
  company: 'perfood GmbH',
  role: 'Frontend-Entwickler',

  paragraph: [
    `I developed Ionic-based Angular components and implemented NestJS-based backend services. To improve UI consistency and reusability, I introduced Storybook for component documentation. Additionally, I began establishing a clear separation between presentational and smart components to enhance maintainability and scalability. My work focused on creating modular and efficient solutions within a structured development process.`,
  ],
};

export const TRIP = {
  id: 3,
  from: JANUAR_2022,
  to: JUNI_2022,
  description: '',
  company: 'Career break and travel',
  role: 'Cologne - Marrakech',

  exclude: true,
};

export const TIMS = {
  id: 4,
  from: FEBRUAR_2020,
  to: DEZEMBER_2021,
  description: '',
  company: 'akros AG',
  role: 'Frontend-Entwickler und UX-Designer',

  paragraph: [
    `
      As a Senior Software Engineer from February
      2020 to December 2021, I specialized in modern
      frontend technologies and UI architecture.
      My work focused on Angular development,
      where I built and optimized applications while
      modernizing the UI tech stack from Angular 8 to 12,
      incorporating tools like Storybook, Jest, Cypress,
      Loki, and Nx. I introduced a structured component architecture
      by implementing container and presentational components.
    `,
    `
      To enhance maintainability and scalability, I moved
      business logic from UI components to Angular services
      and introduced NgRx for state management.
      Additionally, I developed a reusable UI component
      library to standardize the frontend ecosystem. I also
      consolidated multiple Angular applications, unifying
      their appearance and dependencies within an Nx monorepo,
      improving code sharing and maintainability. My role also
      involved IoT-specific performance optimization and the
      implementation of UI build pipelines using MS Azure and Jenkins.
    `,
    `
      Beyond development, I contributed as a technical leader, coaching
      a React team, mentoring junior developers, and supervising
      apprentices. My expertise in clean architecture, performance
      optimization, and modern development practices played a key
      role in advancing frontend projects.
    `,
  ],
};

export const AXA = {
  id: 5,
  from: FEBRUAR_2017,
  to: DEZEMBER_2019,
  description: '',
  company: 'Axa Konzern AG',
  role: 'Softwareentwickler',
  paragraph: [
    `
      I focused on developing and maintaining modern web applications
      using React, Express.js, TypeScript, and Node.js as part of the
      latest generation of end-customer tariff calculators. My work involved
      implementing new features, optimizing performance, and ensuring
      maintainability. Additionally, I contributed ideas for improving
      the build pipeline, DevOps processes, and cloud integration,
      developing prototypes and supporting ongoing projects.
      I also provided technical consultation to Product Owners when needed.
    `,
  ],
};

export const NLI = {
  id: 6,
  from: JANUAR_2013,
  to: DEZEMBER_2016,
  description: '',
  company: 'Next Level Integration GmbH',
  role: 'Berater, Entwickler und Projektleiter',

  paragraph: [
    `
      I worked on developing tariff customer portals
      for energy providers, primarily using AngularJS and
      Java, as well as ExtJS and Java. My responsibilities
      included gathering customer requirements, estimating
      effort, and providing technical consulting to ensure
      the successful implementation of functional requirements.
    `,
    `
      In addition to development, I contributed to improving
      internal development processes, supported release management,
      and assisted Product Owners. I also played a key role in
      onboarding and mentoring new team members, ensuring smooth
      knowledge transfer and team efficiency.
    `,
  ],
};

export const FH = {
  id: 7,
  from: OKTOBER_2010,
  to: FEBRUARY_2013,
  description: '',
  company: 'Cologne University of Applied Sciences',
  role: 'Student Assistant / Research Assistant',

  exclude: true,
  paragraph: [
    `
      As a student assistant in the Modeling of Application Systems
      course, I supported teaching activities and assisted students
      in understanding UML-based system modeling. The course followed
      a systematic methodology, transforming models from use case
      diagrams to class diagrams and either sequence diagrams or
      activity diagrams.
    `,
    `
      My master's thesis expanded on this approach by integrating the
      systematic UML modeling methodology with the methodology of
      interaction design, bridging structured system development with
      user-centered design principles.
    `,
  ],
};

export const AUSBILDUNG = {
  id: 8,
  from: AUGUST_2005,
  to: JUNE_2008,
  description: '',
  company: 'IGMG e.V.',
  role: 'Apprentice in Software Development',

  exclude: true,
  paragraph: [
    `
      During my apprenticeship, I developed an HR management tool
      using .NET technologies, primarily C# and ASP.NET. This experience
      provided me with an initial foundation in backend development
      and enterprise software solutions.
    `,
  ],
};
