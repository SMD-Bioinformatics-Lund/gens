// GENS module

import TranscriptTrack from './transcript.js'
import AnnotationTrack from './annotation.js'
import VariantTrack from './variant.js'

function initCanvases ({ hgType, hgFileDir, uiColors }) {
  // WEBGL values
  const near = 0.1
  const far = 100
  const lineMargin = 2 // Margin for line thickness
  // Listener values
  const inputField = document.getElementById('region_field')
  // Initiate interactive canvas
  const ic = new InteractiveCanvas(inputField, lineMargin, near, far, sampleName, hgType, hgFileDir)
  // Initiate variant, annotation and transcript canvases
  const vc = new VariantTrack(ic.x, ic.plotWidth, near, far, hgType, uiColors.variants, selectedVariant)
  const tc = new TranscriptTrack(ic.x, ic.plotWidth, near, far, hgType, uiColors.transcripts)
  const ac = new AnnotationTrack(ic.x, ic.plotWidth, near, far, hgType, annotationFile)
  // Initiate and draw overview canvas
  const oc = new OverviewCanvas(ic.x, ic.plotWidth, lineMargin, near, far, sampleName, hgType, hgFileDir)
  return {
    interactive: ic,
    variant: vc,
    transcript: tc,
    annotation: ac,
    overview: oc
  }
}
