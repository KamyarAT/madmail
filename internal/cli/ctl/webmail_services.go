package ctl

import (
	"fmt"
	"os"

	maddycli "github.com/themadorg/madmail/internal/cli"
	"github.com/urfave/cli/v2"
)

const (
	dbKeyWebIMAPEnabled = "__WEBIMAP_ENABLED__"
	dbKeyWebSMTPEnabled = "__WEBSMTP_ENABLED__"
)

func init() {
	maddycli.AddSubcommand(newWebToggleCommand(
		"webimap",
		"Enable, disable, or inspect WebIMAP HTTP API",
		dbKeyWebIMAPEnabled,
		"WebIMAP",
	))
	maddycli.AddSubcommand(newWebToggleCommand(
		"websmtp",
		"Enable, disable, or inspect WebSMTP HTTP send API",
		dbKeyWebSMTPEnabled,
		"WebSMTP",
	))
}

func newWebToggleCommand(name, usage, settingKey, displayName string) *cli.Command {
	return &cli.Command{
		Name:  name,
		Usage: usage,
		Description: fmt.Sprintf(`Manage the %s feature toggle.

Examples:
  madmail %s status
  madmail %s enable
  madmail %s disable`, displayName, name, name, name),
		Subcommands: []*cli.Command{
			{
				Name:  "status",
				Usage: fmt.Sprintf("Show %s status", displayName),
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "state-dir",
						Usage:   "Path to the state directory",
						EnvVars: []string{"MADDY_STATE_DIR"},
					},
				},
				Action: func(c *cli.Context) error {
					return webToggleStatus(c, settingKey, displayName)
				},
			},
			{
				Name:  "enable",
				Usage: fmt.Sprintf("Enable %s", displayName),
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "state-dir",
						Usage:   "Path to the state directory",
						EnvVars: []string{"MADDY_STATE_DIR"},
					},
				},
				Action: func(c *cli.Context) error {
					return webToggleSet(c, settingKey, displayName, true)
				},
			},
			{
				Name:  "disable",
				Usage: fmt.Sprintf("Disable %s", displayName),
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "state-dir",
						Usage:   "Path to the state directory",
						EnvVars: []string{"MADDY_STATE_DIR"},
					},
				},
				Action: func(c *cli.Context) error {
					return webToggleSet(c, settingKey, displayName, false)
				},
			},
		},
	}
}

func webToggleStatus(c *cli.Context, key, displayName string) error {
	cfg := getDBConfig(c)
	settings := readSettingsFromDB(cfg)
	status := "disabled"
	if v, ok := settings[key]; ok && v == "true" {
		status = "enabled"
	}

	fmt.Println()
	fmt.Printf("  %s: %s\n", displayName, status)
	fmt.Println()
	return nil
}

func webToggleSet(c *cli.Context, key, displayName string, enabled bool) error {
	cfg := getDBConfig(c)
	value := "false"
	action := "disable"
	if enabled {
		value = "true"
		action = "enable"
	}
	if err := setSetting(cfg, key, value); err != nil {
		return fmt.Errorf("failed to %s %s: %v", action, displayName, err)
	}

	pids, err := reloadRunningDaemons()
	if err != nil {
		fmt.Fprintf(os.Stderr, "warning: could not enumerate running daemons: %v\n", err)
	}
	switch len(pids) {
	case 0:
		fmt.Printf("✅ %s %sd. No running madmail daemon found to signal; change applies on next start.\n", displayName, action)
	case 1:
		fmt.Printf("✅ %s %sd and signalled running madmail daemon (pid %d) for soft reload.\n", displayName, action, pids[0])
	default:
		fmt.Printf("✅ %s %sd and signalled %d running madmail daemons (pids %v) for soft reload.\n", displayName, action, len(pids), pids)
	}

	return nil
}
