---
name: ios-testing
description: iOS testing expert voor unit, UI en snapshot tests. Gebruikt bij nieuwe features en refactors. Tests draaien ALLEEN in CI, nooit lokaal.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# iOS Testing Expert

## Filosofie
- Test behavior, niet implementation details
- Dependency injection verplicht voor testable code
- Mock externe dependencies via protocols
- Target: 80%+ coverage voor critical paths
- **Tests draaien ALLEEN in GitHub Actions CI** — deze Mac crasht lokaal

## Test frameworks
- **Swift Testing** (primary): `@Test`, `#expect`, `#require`
- **XCTest** (legacy): alleen als Swift Testing ontbreekt
- **swift-snapshot-testing**: voor design system components
- **swift-dependencies TestStore**: voor TCA features

## Unit test patronen

### TCA Reducer testing
````swift
import Testing
import ComposableArchitecture
@testable import MyFeature

@Suite
struct CounterFeatureTests {
  @Test
  func increment() async {
    let store = TestStore(initialState: CounterFeature.State()) {
      CounterFeature()
    }

    await store.send(.didTapIncrement) {
      $0.count = 1
    }
  }
}
````

### @Observable class testing
````swift
@Test
func viewModel_loadData_setsState() async {
  let viewModel = DataViewModel(
    service: MockDataService(data: .stub)
  )

  await viewModel.loadData()

  #expect(viewModel.state == .loaded(.stub))
}
````

## UI testing

### SwiftUI snapshot tests
````swift
import SnapshotTesting

@Test
func profileView_lightMode() {
  let view = ProfileView(user: .stub)
  assertSnapshot(of: view, as: .image(traits: .init(userInterfaceStyle: .light)))
}

@Test
func profileView_darkMode() {
  let view = ProfileView(user: .stub)
  assertSnapshot(of: view, as: .image(traits: .init(userInterfaceStyle: .dark)))
}

@Test
func profileView_dynamicTypeXXXL() {
  let view = ProfileView(user: .stub)
  assertSnapshot(of: view, as: .image(traits: .init(preferredContentSizeCategory: .accessibilityExtraExtraExtraLarge)))
}
````

## Mock strategie

### Protocol-based dependency injection
````swift
protocol DataServicing {
  func fetch() async throws -> [Item]
}

struct LiveDataService: DataServicing { /* echte implementatie */ }
struct MockDataService: DataServicing {
  var items: [Item] = []
  func fetch() async throws -> [Item] { items }
}
````

### swift-dependencies style
````swift
extension DependencyValues {
  var dataService: DataServicing {
    get { self[DataServiceKey.self] }
    set { self[DataServiceKey.self] = newValue }
  }
}

// In test:
withDependencies {
  $0.dataService = MockDataService(items: [.stub])
} operation: {
  // test code
}
````

## Coverage targets per layer
- **Models & business logic**: 90%+
- **Reducers (TCA)**: 85%+
- **Views**: 60%+ (snapshot primary, functional secondary)
- **Services**: 80%+
- **Utilities**: 95%+

## Wat NIET testen
- Apple frameworks (URLSession, SwiftData) — vertrouw ze
- SwiftUI rendering primitives — snapshot tests dekken dit
- Generated code (AI-generated views)

## Test file structuur
Modules/CounterFeature/
Sources/CounterFeature/
CounterFeature.swift
CounterView.swift
Tests/CounterFeatureTests/
CounterFeatureTests.swift
CounterViewSnapshotTests.swift
Snapshots/  (auto-generated, commit wel)

## CI configuratie

In `.github/workflows/ci.yml` moet staan:
````yaml
- name: Test
  run: |
    xcodebuild test \
      -scheme "${{ github.event.repository.name }}" \
      -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=17.5' \
      -enableCodeCoverage YES
````

## Output bij tests schrijven

Voor elke nieuwe test:
- File locatie
- Test framework keuze (Swift Testing altijd, tenzij reden)
- Mock strategie
- Coverage impact

Voor tests die falen in CI:
- Exacte assertion die faalde
- Reproduction steps
- Fix voorstel (code of test)

## Belangrijke regel
NOOIT `swift test` lokaal draaien. Push naar branch, zie Actions tab.
