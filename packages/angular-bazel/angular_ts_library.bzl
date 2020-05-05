"Shows how to enable both worker mode and use_angular_plugin to make a drop-in replacement for ng_module"

load("@npm_bazel_typescript//:index.bzl", "ts_library")

def ng_ts_library(**kwargs):
    ts_library(
        compiler = "//packages/angular-bazel:tsc_wrapped_with_angular",
        supports_workers = True,
        use_angular_plugin = True,
        **kwargs
    )