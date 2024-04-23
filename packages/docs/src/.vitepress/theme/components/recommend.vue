<template>
  <div align="center">
    <div class="my-8 w-20% border-t-solid border-t-1px border-gray-300/20" />
    <h1 class="mt-8 text-2xl font-semibold text-center">
      Recommended collocation for Vue Vine
    </h1>
    <div
      class="
        w-fit
        flex flex-row justify-center items-center p-4
        bg-gray-100/50 dark:bg-gray-800/50
        rounded-lg mt-4 gap-2
      "
    >
      <div class="w-fit flex py2 relative group">
        <div class="group-hover:(bg-gradient-to-tl from-[#bd34fe_50%] to-[#47caff_50%]) recommendation-bg" />
        <a class="i-logos-vitejs text-3xl cursor-pointer z-2 mx4" href="https://vitejs.dev/" target="_blank" />
      </div>
      <div class="w-fit flex py2 relative group">
        <div class="group-hover:bg-gray-500/50 recommendation-bg" />
        <a class="i-logos-unocss text-3xl cursor-pointer z-2 mx4 light:brightness-9 dark:filter-invert-90" href="https://unocss.dev/" target="_blank" />
      </div>
      <div class="w-fit flex py2 relative group">
        <div class="group-hover:(bg-gradient-to-tl to-[#4D9DE3_50%] from-[#69ACFF_50%]) recommendation-bg" />
        <a class="i-logos-visual-studio-code text-3xl cursor-pointer z-2 mx4" href="https://code.visualstudio.com/" target="_blank" />
      </div>
    </div>
  </div>
</template>
