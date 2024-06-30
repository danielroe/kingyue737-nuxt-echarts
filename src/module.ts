import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addComponentsDir,
  addImports,
  addTemplate,
  addTypeTemplate,
} from '@nuxt/kit'

import type { ModuleOptions } from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-echarts',
    configKey: 'echarts',
    compatibility: {
      // Semver version of supported nuxt versions
      nuxt: '>=3.2.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    renderer: 'canvas',
  },
  setup(options, nuxt) {
    if (nuxt.options.ssr === false) {
      nuxt.options.experimental.componentIslands = true
    }

    const { resolve } = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))

    addComponentsDir({
      path: resolve('runtime/components'),
      ignore: options.ssr ? undefined : ['VChart.server.vue'],
    })

    nuxt.options.css.unshift(resolve('./runtime/style.css'))

    function join(arr?: string[]) {
      return arr?.map((name) => `  ${name},`).join('\n') || ''
    }

    let renderers = []
    if (
      typeof options.renderer === 'string' ||
      options.renderer instanceof String
    ) {
      renderers.push(options.renderer)
    } else {
      renderers = options.renderer!
    }
    const rendererNames: ('CanvasRenderer' | 'SVGRenderer')[] = []
    renderers.forEach((v) => {
      if (v === 'canvas') rendererNames.push('CanvasRenderer')
      else if (v === 'svg') rendererNames.push('SVGRenderer')
    })
    const joinedRendererNames = join(rendererNames)
    const joinedChartNames = join(options.charts)
    const joinedComponentNames = join(options.components)
    const joinedFeatureNames = join(options.features)
    addTemplate({
      filename: 'echarts.mjs',
      write: true,
      getContents: () =>
        [
          '// Generated by nuxt-echarts',
          '',
          "import { use } from 'echarts/core'",
          'import {',
          joinedRendererNames,
          "} from 'echarts/renderers'",
          'import {',
          joinedChartNames,
          "} from 'echarts/charts'",
          'import {',
          joinedComponentNames,
          "} from 'echarts/components'",
          'import {',
          joinedFeatureNames,
          "} from 'echarts/features'",
          '',
          'use([',
          joinedRendererNames,
          joinedChartNames,
          joinedComponentNames,
          joinedFeatureNames,
          '])',
        ].join('\n'),
    })

    if (options.charts || options.components) {
      const chartOptionNames = options.charts?.map(
        (name) => `${name.slice(0, -5)}SeriesOption`,
      )
      const componentOptionNames = options.components?.map(
        (name) => `${name}Option`,
      )
      addTypeTemplate({
        filename: 'types/nuxt-echarts.d.ts',
        getContents: () =>
          [
            `// Generated by nuxt-echarts`,
            '',
            "import type { ComposeOption } from 'echarts/core'",
            'import type {',
            join(chartOptionNames),
            "} from 'echarts/charts'",
            'import type {',
            join(componentOptionNames),
            "} from 'echarts/components'",
            '',
            'declare global {',
            '  export type ECOption = ComposeOption<',
            `${chartOptionNames?.map((name) => `    | ${name}`).join('\n')}`,
            `${componentOptionNames?.map((name) => `    | ${name}`).join('\n')}`,
            '  >',
            '}',
            '',
            'export {}',
          ].join('\n'),
      })
    }

    ;[
      'THEME_KEY',
      'INIT_OPTIONS_KEY',
      'UPDATE_OPTIONS_KEY',
      'LOADING_OPTIONS_KEY',
    ].forEach((name) =>
      addImports({ name, from: resolve('./runtime/utils/injection') }),
    )
  },
})
