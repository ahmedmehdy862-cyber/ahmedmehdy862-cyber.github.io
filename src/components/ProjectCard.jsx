import { motion } from 'framer-motion';

export default function ProjectCard({ project, index }) {
  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      HTML: '#e34c26',
      CSS: '#563d7c',
      default: '#6c63ff',
    };
    return colors[lang] || colors.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass rounded-xl p-6 hover:border-accent transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-dark border border-dark-border group-hover:border-accent transition-colors">
          <svg
            className="w-6 h-6 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          {project.stargazers_count > 0 && (
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {project.stargazers_count}
            </span>
          )}
          {project.forks_count > 0 && (
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {project.forks_count}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-accent transition-colors">
        {project.name}
      </h3>
      <p className="text-text-secondary text-sm mb-4 line-clamp-2">
        {project.description || 'لا يوجد وصف متاح'}
      </p>

      <div className="flex items-center justify-between">
        {project.language && (
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getLanguageColor(project.language) }}
            />
            {project.language}
          </span>
        )}
        <a
          href={project.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-light text-sm font-medium transition-colors"
        >
          عرض المشروع →
        </a>
      </div>
    </motion.div>
  );
}
