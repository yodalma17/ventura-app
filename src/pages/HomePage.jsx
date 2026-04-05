import { Link } from 'react-router-dom'

const content = {
  es: {
    brand: 'Ventura Extranjeria',
    menu: {
      services: 'Servicios',
      team: 'Equipo',
      blog: 'Blog',
      contact: 'Contacto',
      login: 'Login',
    },
    hero: {
      kicker: 'Abogado de Extranjeria e Inmigracion estes donde estes',
      title: 'Tu regularizacion empieza aqui',
      summary: 'Abogados de extranjeria. Actuacion en toda Espana. Despacho Pau Ventura.',
      primaryCta: 'Pide cita ahora',
      secondaryCta: 'Contacta ahora',
      stats: ['clientes atendidos', 'seguidores en redes', 'seguidores de Pau Ventura'],
    },
    appointments: {
      title: 'Reserva tu cita segun tu tramite',
      subtitle: 'Selecciona la categoria que necesitas y agenda tu consulta online.',
      items: [
        'Cita previa Extranjeria',
        'Visado de Estudios en Origen',
        'Residencia No Lucrativa',
        'Derecho Laboral',
        'Homologacion',
        'Nomada Digital y PAC',
      ],
      action: 'Reservar cita',
    },
    services: {
      title: 'Hacemos extranjeria, laboral y homologaciones',
      subtitle: 'Estrategia legal clara y acompanamiento experto para cada fase de tu proceso.',
      items: [
        {
          title: 'Extranjeria',
          description:
            'Tramitacion integral para arraigo, residencia, nacionalidad y recursos administrativos en toda Espana.',
        },
        {
          title: 'Laboral',
          description:
            'Asistencia legal para trabajadores extranjeros, regularizacion y defensa en conflictos laborales.',
        },
        {
          title: 'Homologaciones',
          description:
            'Acompanamiento para homologar estudios y cualificaciones profesionales con estrategia documental.',
        },
      ],
    },
    team: {
      title: 'Quien es Pau Ventura',
      paragraphOne:
        'Pau Ventura Alvarez es abogado especializado en Derecho de Extranjeria, Nacionalidad y Asilo Politico, colegiado en Barcelona con el numero 46337.',
      paragraphTwo:
        'Su despacho se enfoca exclusivamente en tramites de extranjeria y en la divulgacion de informacion legal util para la comunidad migrante en Espana.',
      cta: 'Quiero una asesoria',
    },
    channel: {
      title: 'Unete al canal de WhatsApp',
      subtitle: 'Vive al dia las novedades del sector y recibe consejos gratuitos.',
      cta: 'Unirme ahora',
    },
    blog: {
      title: 'Blog de Extranjeria',
      subtitle: 'Guias y actualizaciones para que avances con seguridad en tus tramites.',
      action: 'Leer articulo',
      items: [
        {
          title: 'Arraigo familiar paso a paso: guia completa para presentar un expediente solido',
          href: 'https://venturaextranjeria.com/arraigo-familiar-paso-a-paso-guia-completa-para-presentar-un-expediente-solido/',
        },
        {
          title: 'Errores frecuentes en solicitudes de arraigo familiar y como evitarlos en 2026',
          href: 'https://venturaextranjeria.com/errores-frecuentes-en-solicitudes-de-arraigo-familiar-y-como-evitarlos-en-2026/',
        },
        {
          title: 'Convivencia y dependencia economica: como acreditarlas para el arraigo familiar',
          href: 'https://venturaextranjeria.com/convivencia-y-dependencia-economica-como-acreditarlas-para-el-arraigo-familiar/',
        },
      ],
    },
    footer: {
      title: 'Somos tus especialistas en extranjeria de confianza',
      subtitle: 'Reserva cita, resuelve dudas y trabaja con un equipo enfocado en resultados reales.',
      reserve: 'Reserva cita',
      call: 'Llama ahora',
      legal:
        'Copyright 2023 Pau Ventura | Aviso Legal | Politica de privacidad | Politica de cookies | Mapa Web | Declaracion de accesibilidad | Condiciones de contratacion',
    },
  },
  en: {
    brand: 'Ventura Immigration',
    menu: {
      services: 'Services',
      team: 'Team',
      blog: 'Blog',
      contact: 'Contact',
      login: 'Login',
    },
    hero: {
      kicker: 'Immigration Lawyer, wherever you are',
      title: 'Your regularization starts here',
      summary: 'Immigration lawyers operating across Spain. Pau Ventura law firm.',
      primaryCta: 'Book appointment now',
      secondaryCta: 'Contact us',
      stats: ['clients served', 'social media followers', 'Pau Ventura followers'],
    },
    appointments: {
      title: 'Book your appointment by process type',
      subtitle: 'Choose the category you need and schedule your online consultation.',
      items: [
        'Immigration appointment',
        'Study Visa from Origin',
        'Non-Lucrative Residence',
        'Labor Law',
        'Academic Recognition',
        'Digital Nomad and HQP',
      ],
      action: 'Book now',
    },
    services: {
      title: 'We handle immigration, labor law and recognitions',
      subtitle: 'Clear legal strategy and expert support for every stage of your case.',
      items: [
        {
          title: 'Immigration',
          description:
            'Full case management for roots permits, residency, nationality and administrative appeals throughout Spain.',
        },
        {
          title: 'Labor Law',
          description:
            'Legal support for foreign workers, regularization and defense in labor disputes.',
        },
        {
          title: 'Recognitions',
          description:
            'Guidance for degree recognition and professional qualifications with strategic documentation.',
        },
      ],
    },
    team: {
      title: 'Who is Pau Ventura',
      paragraphOne:
        'Pau Ventura Alvarez is a lawyer focused on Immigration Law, Nationality and Asylum, registered in Barcelona under number 46337.',
      paragraphTwo:
        'The firm is fully focused on immigration procedures and legal outreach for migrant communities in Spain.',
      cta: 'I want legal advice',
    },
    channel: {
      title: 'Join the WhatsApp channel',
      subtitle: 'Stay updated with sector news and receive free practical tips.',
      cta: 'Join now',
    },
    blog: {
      title: 'Immigration Blog',
      subtitle: 'Guides and updates to move forward safely with your procedures.',
      action: 'Read article',
      items: [
        {
          title: 'Family roots step by step: complete guide to build a strong case file',
          href: 'https://venturaextranjeria.com/arraigo-familiar-paso-a-paso-guia-completa-para-presentar-un-expediente-solido/',
        },
        {
          title: 'Common mistakes in family roots applications and how to avoid them in 2026',
          href: 'https://venturaextranjeria.com/errores-frecuentes-en-solicitudes-de-arraigo-familiar-y-como-evitarlos-en-2026/',
        },
        {
          title: 'Coexistence and financial dependency: how to prove them for family roots',
          href: 'https://venturaextranjeria.com/convivencia-y-dependencia-economica-como-acreditarlas-para-el-arraigo-familiar/',
        },
      ],
    },
    footer: {
      title: 'We are your trusted immigration specialists',
      subtitle: 'Book an appointment, resolve your questions and work with a results-driven legal team.',
      reserve: 'Book appointment',
      call: 'Call now',
      legal:
        'Copyright 2023 Pau Ventura | Legal Notice | Privacy Policy | Cookies Policy | Site Map | Accessibility Statement | Terms and conditions',
    },
  },
}

function HomePage({ language, onLanguageChange }) {
  const t = content[language] ?? content.es
  const teamPlaceholder =
    'https://placehold.co/900x1100/e9e1d7/1d2b34?text=Imagen+Placeholder'

  return (
    <div className="site-shell">
      <header className="site-header wow animate__animated animate__fadeInDown" data-wow-delay="0.1s">
        <a className="brand" href="#inicio">
          {t.brand}
        </a>
        <nav className="main-menu">
          <a href="#servicios">{t.menu.services}</a>
          <a href="#equipo">{t.menu.team}</a>
          <a href="#blog">{t.menu.blog}</a>
          <a href="#contacto">{t.menu.contact}</a>
          <select
            className="lang-select"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            aria-label="Language selector"
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
          <Link className="login-button" to="/login">
            {t.menu.login}
          </Link>
        </nav>
      </header>

      <main>
        <section id="inicio" className="hero-section">
          <div className="hero-overlay" aria-hidden="true" />
          <div className="hero-content">
            <p className="hero-kicker wow animate__animated animate__fadeInUp" data-wow-delay="0.2s">
              {t.hero.kicker}
            </p>
            <h1 className="wow animate__animated animate__fadeInUp" data-wow-delay="0.3s">
              {t.hero.title}
            </h1>
            <p className="hero-summary wow animate__animated animate__fadeInUp" data-wow-delay="0.4s">
              {t.hero.summary}
            </p>
            <div className="hero-ctas wow animate__animated animate__fadeInUp" data-wow-delay="0.5s">
              <Link className="btn btn-primary" to="/login">
                {t.hero.primaryCta}
              </Link>
              <Link className="btn btn-secondary" to="/login">
                {t.hero.secondaryCta}
              </Link>
            </div>
            <div className="hero-stats wow animate__animated animate__zoomIn" data-wow-delay="0.6s">
              <article>
                <strong>87.723+</strong>
                <span>{t.hero.stats[0]}</span>
              </article>
              <article>
                <strong>2.500.000+</strong>
                <span>{t.hero.stats[1]}</span>
              </article>
              <article>
                <strong>450.000+</strong>
                <span>{t.hero.stats[2]}</span>
              </article>
            </div>
          </div>
        </section>

        <section id="citas" className="section section-appointments">
          <div className="section-head wow animate__animated animate__fadeInUp">
            <h2>{t.appointments.title}</h2>
            <p>{t.appointments.subtitle}</p>
          </div>
          <div className="appointments-grid">
            {t.appointments.items.map((item, index) => (
              <Link
                key={item}
                className="card wow animate__animated animate__fadeInUp"
                data-wow-delay={`${0.08 * (index + 1)}s`}
                to="/login"
              >
                <h3>{item}</h3>
                <span>{t.appointments.action}</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="servicios" className="section section-services">
          <div className="section-head wow animate__animated animate__fadeInUp">
            <h2>{t.services.title}</h2>
            <p>{t.services.subtitle}</p>
          </div>
          <div className="service-grid">
            {t.services.items.map((service, index) => (
              <article
                key={service.title}
                className="service-item wow animate__animated animate__fadeInUp"
                data-wow-delay={`${0.15 * (index + 1)}s`}
              >
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="equipo" className="section section-team">
          <div className="team-media wow animate__animated animate__fadeInLeft" data-wow-delay="0.2s">
            <img
              src={teamPlaceholder}
              alt="Imagen placeholder"
              loading="lazy"
            />
          </div>
          <div className="team-content wow animate__animated animate__fadeInRight" data-wow-delay="0.3s">
            <h2>{t.team.title}</h2>
            <p>{t.team.paragraphOne}</p>
            <p>{t.team.paragraphTwo}</p>
            <Link className="btn btn-primary team-cta" to="/login">
              {t.team.cta}
            </Link>
          </div>
        </section>

        <section className="section section-channel wow animate__animated animate__fadeInUp" data-wow-delay="0.2s">
          <h2>{t.channel.title}</h2>
          <p>{t.channel.subtitle}</p>
          <Link className="btn btn-secondary" to="/login">
            {t.channel.cta}
          </Link>
        </section>

        <section id="blog" className="section section-blog">
          <div className="section-head wow animate__animated animate__fadeInUp">
            <h2>{t.blog.title}</h2>
            <p>{t.blog.subtitle}</p>
          </div>
          <div className="blog-grid">
            {t.blog.items.map((post, index) => (
              <a
                key={post.title}
                className="blog-card wow animate__animated animate__fadeInUp"
                data-wow-delay={`${0.12 * (index + 1)}s`}
                href={post.href}
                target="_blank"
                rel="noreferrer"
              >
                <h3>{post.title}</h3>
                <span>{t.blog.action}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer id="contacto" className="site-footer wow animate__animated animate__fadeInUp" data-wow-delay="0.2s">
        <h2>{t.footer.title}</h2>
        <p>{t.footer.subtitle}</p>
        <div className="footer-actions">
          <Link className="btn btn-primary" to="/login">
            {t.footer.reserve}
          </Link>
          <Link className="btn btn-secondary" to="/login">
            {t.footer.call}
          </Link>
        </div>
        <small>{t.footer.legal}</small>
      </footer>
    </div>
  )
}

export default HomePage
