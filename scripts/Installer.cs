using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace VictusClientInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private CheckBox chkLaunch;
        private Button btnAction;
        private string installDir;

        public InstallerForm()
        {
            this.Text = "VictusClient Setup";
            this.Size = new Size(540, 340);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(13, 14, 21);
            this.ForeColor = Color.FromArgb(243, 244, 246);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "VictusClient");

            InitializeComponents();
            StartInstallation();
        }

        private void InitializeComponents()
        {
            // Title Header
            lblTitle = new Label();
            lblTitle.Text = "VictusClient Setup";
            lblTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(30, 24);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            // Subtitle
            lblSubtitle = new Label();
            lblSubtitle.Text = "Installing Next-Level Minecraft Launcher & Client...";
            lblSubtitle.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(168, 85, 247);
            lblSubtitle.Location = new Point(32, 58);
            lblSubtitle.AutoSize = true;
            this.Controls.Add(lblSubtitle);

            // Status label
            lblStatus = new Label();
            lblStatus.Text = "Preparing installation files...";
            lblStatus.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(156, 163, 175);
            lblStatus.Location = new Point(32, 110);
            lblStatus.Size = new Size(460, 20);
            this.Controls.Add(lblStatus);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(32, 136);
            progressBar.Size = new Size(460, 22);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            // Checkbox: Launch after install
            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch VictusClient after setup exits";
            chkLaunch.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            chkLaunch.ForeColor = Color.FromArgb(220, 220, 230);
            chkLaunch.Checked = true;
            chkLaunch.Location = new Point(32, 190);
            chkLaunch.AutoSize = true;
            chkLaunch.Visible = false;
            this.Controls.Add(chkLaunch);

            // Action Button (Close / Finish)
            btnAction = new Button();
            btnAction.Text = "Installing...";
            btnAction.Size = new Size(130, 36);
            btnAction.Location = new Point(362, 236);
            btnAction.BackColor = Color.FromArgb(147, 51, 234);
            btnAction.ForeColor = Color.White;
            btnAction.FlatStyle = FlatStyle.Flat;
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnAction.Enabled = false;
            btnAction.Click += BtnAction_Click;
            this.Controls.Add(btnAction);
        }

        private void StartInstallation()
        {
            Thread t = new Thread(InstallWorker);
            t.IsBackground = true;
            t.Start();
        }

        private void InstallWorker()
        {
            try
            {
                UpdateProgress(10, "Creating installation directory...");
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                UpdateProgress(25, "Extracting application packages...");
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("AppPackage"))
                {
                    if (stream != null)
                    {
                        using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                        {
                            int totalEntries = archive.Entries.Count;
                            int count = 0;
                            foreach (ZipArchiveEntry entry in archive.Entries)
                            {
                                string destPath = Path.Combine(installDir, entry.FullName);
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                else
                                {
                                    string dir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                                    entry.ExtractToFile(destPath, true);
                                }
                                count++;
                                if (count % 10 == 0)
                                {
                                    int pct = 25 + (int)(((double)count / totalEntries) * 55);
                                    UpdateProgress(pct, string.Format("Extracting: {0}", entry.Name));
                                }
                            }
                        }
                    }
                    else
                    {
                        // Fallback if payload file on disk
                        string localPayload = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "release", "app-package.zip");
                        if (File.Exists(localPayload))
                        {
                            ZipFile.ExtractToDirectory(localPayload, installDir);
                        }
                    }
                }

                UpdateProgress(85, "Creating desktop and start menu shortcuts...");
                CreateShortcuts();

                UpdateProgress(95, "Registering application with Windows...");
                RegisterUninstall();

                UpdateProgress(100, "Installation completed successfully!");
                this.Invoke((MethodInvoker)delegate
                {
                    lblStatus.Text = "VictusClient is ready to launch.";
                    lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
                    chkLaunch.Visible = true;
                    btnAction.Text = "Finish";
                    btnAction.Enabled = true;
                });
            }
            catch (Exception ex)
            {
                this.Invoke((MethodInvoker)delegate
                {
                    lblStatus.Text = "Installation error: " + ex.Message;
                    lblStatus.ForeColor = Color.FromArgb(244, 63, 94);
                    btnAction.Text = "Close";
                    btnAction.Enabled = true;
                });
            }
        }

        private void UpdateProgress(int value, string text)
        {
            this.Invoke((MethodInvoker)delegate
            {
                progressBar.Value = Math.Min(100, Math.Max(0, value));
                lblStatus.Text = text;
            });
        }

        private void CreateShortcuts()
        {
            try
            {
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);

                    // Desktop Shortcut
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string desktopLnk = Path.Combine(desktopPath, "VictusClient.lnk");
                    dynamic shortcut = shell.CreateShortcut(desktopLnk);
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = installDir;
                    shortcut.Description = "VictusClient - Premium Minecraft Launcher";
                    shortcut.Save();

                    // Start Menu Shortcut
                    string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    string startLnk = Path.Combine(startMenu, "VictusClient.lnk");
                    dynamic startShortcut = shell.CreateShortcut(startLnk);
                    startShortcut.TargetPath = exePath;
                    startShortcut.WorkingDirectory = installDir;
                    startShortcut.Description = "VictusClient - Premium Minecraft Launcher";
                    startShortcut.Save();
                }
            }
            catch {}
        }

        private void RegisterUninstall()
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\VictusClient";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        string exePath = Path.Combine(installDir, "VictusClient.exe");
                        key.SetValue("DisplayName", "VictusClient");
                        key.SetValue("DisplayVersion", "1.0.0");
                        key.SetValue("Publisher", "VictusClient Team");
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("DisplayIcon", exePath);
                        key.SetValue("UninstallString", "cmd.exe /c rd /s /q \"" + installDir + "\"");
                    }
                }
            }
            catch {}
        }

        private void BtnAction_Click(object sender, EventArgs e)
        {
            if (chkLaunch.Checked)
            {
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                if (File.Exists(exePath))
                {
                    Process.Start(new ProcessStartInfo(exePath) { WorkingDirectory = installDir });
                }
            }
            Application.Exit();
        }
    }
}
