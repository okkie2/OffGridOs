Feature: Surface media and notes persistence
  Scenario: Create, read, update, and clear surface notes and photo
    Given OffGridOS is rendered with project data
    When I open Production from the menu
    And I open the first surface detail from the page
    And I enter surface notes "First test notes"
    And I upload a surface photo
    And I save the surface information
    Then the active surface should persist notes "First test notes" with a stored photo
    When I reload OffGridOS
    And I open Production from the menu
    And I open the first surface detail from the page
    And I enter surface notes "Updated test notes"
    And I remove the surface photo
    And I save the surface information
    Then the active surface should persist notes "Updated test notes" without a stored photo
