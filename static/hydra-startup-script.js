/* eslint-disable no-undef */
// @ts-nocheck


// noise(2,7).colorama(0.78).modulateScale(src(o0).mult(noise(5))).modulateRotate(osc(10,2,2).modulatePixelate(o0)).modulateScrollY(noise(3)).out(o0)


solid().out(o0)
a.show()
a.setBins(1)

shape(1000).scale(() => Math.max(0.001, window.data.pot1*a.fft[0]))
    .scrollX(() => 1)
    .scrollY(() => 1)
    .modulateScrollY(o1)
    .modulateScrollX(o1)
    .scrollY(0.98,0.05)
    .add(src(o1)
        .color(0.5,0.9,0.85)
        .scrollX(() => window.data.pot3)
        .scrollY(() => window.data.pot4)
        , 0.99)
    .out(o1)

src(o1).add(src(o2).scale(1.005), 0.7).out(o2)

render(o2)