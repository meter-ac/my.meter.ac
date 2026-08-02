const EVENTS = [
  { label: 'METER.AC: Exploring the Atmosphere 3 | 005', href: 'https://meter.ac/event/005/' },
  { label: 'METER.AC: Exploring the Atmosphere 2 | 004', href: 'https://meter.ac/event/004/' },
  { label: 'METER.AC: Exploring the Atmosphere | 003', href: 'https://meter.ac/event/003/' },
  { label: 'METER.AC: New Challenges and Solutions | 002', href: 'https://meter.ac/event/002/' },
  { label: 'METER.AC: The Beginning | 001', href: 'https://meter.ac/event/001/' },
];

const PUBLICATIONS = [
  {
    citation:
      'A. Terziyski, S. Tenev, L. Tsankov and V. Jeliazkov, "Beta and Gamma Rays Evaluation Gauge," 2022 22nd International Symposium on Electrical Apparatus and Technologies (SIELA), 2022, pp. 1-2, doi: 10.1109/SIELA54794.2022.9845742',
    href: 'https://ieeexplore.ieee.org/document/9845742',
  },
  {
    citation:
      'A. Terziyski, S. Tenev, V. Jeliazkov and N. Petrov, "UV Radiation Monitoring Probe," 2022 22nd International Symposium on Electrical Apparatus and Technologies (SIELA), 2022, pp. 1-2, doi: 10.1109/SIELA54794.2022.9845750',
    href: 'https://ieeexplore.ieee.org/document/9845750',
  },
  {
    citation:
      'A. Terziyski, S. Tenev, V. Jeliazkov, "A Multisensor Environmental Monitoring Device," 2020 21st International Symposium on Electrical Apparatus & Technologies (SIELA), Burgas, Bulgaria, 2020, pp. 1-3, doi: 10.1109/SIELA49118.2020.9167052',
    href: 'https://ieeexplore.ieee.org/document/9167052',
  },
  {
    citation:
      'A. Terziyski, S. Tenev, V. Jeliazkov, "Radon Concentration Gauge," 2020 21st International Symposium on Electrical Apparatus & Technologies (SIELA), Burgas, Bulgaria, 2020, pp. 1-3, doi: 10.1109/SIELA49118.2020.9167075',
    href: 'https://ieeexplore.ieee.org/document/9167075',
  },
  {
    citation:
      'A. Terziyski, S. Tenev, V. Jeliazkov, N. Jeliazkova, N. Kochev, "METER.AC: Live Open Access Atmospheric Monitoring Data for Bulgaria with High Spatiotemporal Resolution," Data 2020, 5, 36',
    href: 'https://www.mdpi.com/2306-5729/5/2/36',
  },
  {
    citation:
      'A. Terziyski, S. Tenev, V. Jeliazkov, N. Kochev, G. Dimitrov, N. Jeliazkova, L. Iliev, Ch. Angelov, I. Kalapov, T. Arsov, "Balloon-borne measurements in the upper troposphere and lower stratosphere above Bulgaria (N41-43° E24-26°)," Bulgarian Chemical Communications, Volume 51, pp. 153-157, 2019',
    href: 'http://www.bcc.bas.bg/BCC_Volumes/Volume_51_Special_D_2019/BCC-51-D-2019-152-157-Terziyski-32.pdf',
  },
];

const VIDEOS = [
  { label: 'The universe, life and everything else... (2023)', href: 'https://youtu.be/T_VHf2LFjew' },
  { label: 'A Theory of Time (2020)', href: 'https://youtu.be/GYyh9MBnD4U' },
  { label: 'The Balloon of Dreams (2018)', href: 'https://youtu.be/L54MCfriHp0' },
];

const PRESENTATIONS = [
  {
    citation:
      'V. Paskaleva, A. Terziyski, S. Tenev, N. Kochev, "Comprehensive Air Quality Monitoring Strategies in Plovdiv," Green Technologies and Sustainable Ecosystems, Nov 6-7 2025, Plovdiv',
    href: 'https://meter.ac/gs/nodes/html/talk-311.pdf',
  },
  {
    citation:
      'A. Terziyski et al., National Scientific Conference on Environment 2025, NIMH, 19.03.2025 (in Bulgarian)',
    href: 'https://meter.ac/gs/nodes/html/presentation-2025-03-19.pdf',
  },
  {
    citation: 'A. Terziyski, "Citizen science," Student Chemistry Conference, University of Plovdiv, 07.10.2022 (in Bulgarian)',
    href: 'https://meter.ac/gs/nodes/html/scc-2022-v2.pptx',
  },
  {
    citation:
      'A. Terziyski, L. Tsankov, S. Tenev, V. Jeliazkov, "Feasibility of in situ radon monitoring using common GM counters," RAD 2022 Conference',
    href: 'https://meter.ac/gs/nodes/html/RAD_2022_spring-Ludmil_Tsankov.pdf',
  },
  {
    citation:
      'A. Terziyski, N. Kochev, S. Tenev, "Atmospheric air monitoring: From data to interpretation and analysis," New Bulgarian University, 03.02.2021 (in Bulgarian)',
    href: 'https://meter.ac/gs/nodes/html/NBU-20210203.pdf',
  },
  {
    citation: 'A. Terziyski, "Open monitoring network," New Bulgarian University, 27.04.2020 (in Bulgarian)',
    href: 'https://meter.ac/gs/nodes/html/NBU-20200427.pdf',
  },
  {
    citation: 'A. Terziyski, "Open environmental monitoring network," University of Duisburg-Essen, LUAT, 15.05.2019',
    href: 'https://meter.ac/gs/nodes/html/Atanas_Erasmus_150519_LUAT.pdf',
  },
];

const PARTNERS = [
  { label: 'C.lab, Plovdiv University', href: 'https://cart.uni-plovdiv.net/' },
  { label: 'BEO Musala, Bulgarian Academy of Sciences', href: 'http://beo-db.inrne.bas.bg/' },
  {
    label: 'National Institute of Geophysics, Geodesy and Geography, BAS',
    href: 'http://www.niggg.bas.bg/en/',
  },
  { label: 'Institute of Astronomy and National Astronomical Observatory, BAS', href: 'http://www.astro.bas.bg/index.php' },
];

function LinkedList({ items }) {
  return (
    <ul className="about-page__list">
      {items.map((item) => (
        <li key={item.href}>
          <a href={item.href} target="_blank" rel="noreferrer">
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function CitationList({ items }) {
  return (
    <ul className="about-page__list about-page__list--citations">
      {items.map((item) => (
        <li key={item.href}>
          {item.citation}{' '}
          <a href={item.href} target="_blank" rel="noreferrer">
            download ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-page__section">
        <h2>About METER.AC</h2>
        <p>
          METER.AC is an open atmospheric monitoring network developed and deployed by C.lab (Plovdiv University)
          together with{' '}
          <a href="http://beo-db.inrne.bas.bg/" target="_blank" rel="noreferrer">
            BEO Musala
          </a>
          ,{' '}
          <a href="http://www.niggg.bas.bg/en/" target="_blank" rel="noreferrer">
            the National Institute of Geophysics, Geodesy and Geography
          </a>
          , and{' '}
          <a href="http://www.astro.bas.bg/index.php" target="_blank" rel="noreferrer">
            the Institute of Astronomy and National Astronomical Observatory
          </a>{' '}
          (all Bulgarian Academy of Sciences), and MJ Investment Group Ltd.
        </p>
        <p>
          The network observes a broad range of natural processes over a long time scale at high time resolution
          across evenly distributed ground stations, following the{' '}
          <a href="https://en.wikipedia.org/wiki/FAIR_data" target="_blank" rel="noreferrer">
            FAIR data
          </a>{' '}
          principles.
        </p>
        <p className="about-page__license">
          <strong>Data license:</strong> all raw measurements and derived statistics published on this site are
          dedicated to the public domain under{' '}
          <a href="http://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">
            CC0
          </a>{' '}
          — no permission needed, no attribution required. See the{' '}
          <a href="https://meter.ac/gs/metadata" target="_blank" rel="noreferrer">
            raw metadata
          </a>{' '}
          for machine-readable dataset descriptions.
        </p>
      </section>

      <section className="about-page__section">
        <h2>Partner institutions</h2>
        <LinkedList items={PARTNERS} />
      </section>

      <section className="about-page__section">
        <h2>Community</h2>
        <ul className="about-page__list">
          <li>
            <a href="https://discord.gg/CBR5HjZ" target="_blank" rel="noreferrer">
              Discord
            </a>
          </li>
          <li>
            <a href="https://t.me/meter_ac" target="_blank" rel="noreferrer">
              Telegram
            </a>
          </li>
          <li>
            <a href="https://www.facebook.com/meter.ac" target="_blank" rel="noreferrer">
              Facebook
            </a>
          </li>
        </ul>
      </section>

      <section className="about-page__section">
        <h2>Events</h2>
        <LinkedList items={EVENTS} />
      </section>

      <section className="about-page__section">
        <h2>Selected publications</h2>
        <CitationList items={PUBLICATIONS} />
        <h3>Videos</h3>
        <LinkedList items={VIDEOS} />
      </section>

      <section className="about-page__section">
        <h2>Presentations</h2>
        <CitationList items={PRESENTATIONS} />
      </section>
    </div>
  );
}
